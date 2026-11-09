# Study Insights Architecture & System Design

## 1. System Overview

**Study Insights** is a modular, production-ready educational platform designed to diagnose student test errors, identify root causes across cognitive categories, and synthesize targeted practice drills grounded in textbook study materials.

```mermaid
graph TD
    subgraph Client Layer
        ReactApp["React Frontend (Vite) :5173"]
    end

    subgraph Authentication & Storage
        SupaAuth["Supabase Auth (JWT)"]
        SupaStorage["Supabase Storage (study-documents)"]
        SupaDB[("Supabase PostgreSQL")]
    end

    subgraph Application Server
        NodeAPI["Node.js + Express Backend :5000"]
    end

    subgraph AI & Retrieval Microservice
        PythonRAG["Python FastAPI RAG Server :8000"]
        ChromaStore[("ChromaDB Vector Store")]
        GeminiLLM["Google Gemini API (gemini-3.8-flash)"]
    end

    ReactApp -->|1. Authenticate / Session| SupaAuth
    ReactApp -->|2. Upload Original PDF| SupaStorage
    ReactApp -->|3. REST API + Bearer Token| NodeAPI

    NodeAPI -->|4. Validate Token & User| SupaAuth
    NodeAPI -->|5. Relational Queries (RLS)| SupaDB
    NodeAPI -->|6. Storage Signed URLs| SupaStorage
    NodeAPI -->|7. HTTP Microservice RPC| PythonRAG

    PythonRAG -->|8. Isolated Vector Search| ChromaStore
    PythonRAG -->|9. Structured Diagnosis & Drills| GeminiLLM
```

---

## 2. Key Architectural Decisions

### Why MongoDB Was Rejected
1. **Relational Integrity**: Academic entities (Users $\rightarrow$ Tests $\rightarrow$ Questions $\rightarrow$ Attempts $\rightarrow$ Answers $\rightarrow$ Mistakes $\rightarrow$ Insights $\rightarrow$ Practice Questions) are inherently relational. PostgreSQL foreign keys with `ON DELETE CASCADE` guarantee data consistency.
2. **Native JSONB Support**: PostgreSQL provides native, queryable, indexed `JSONB` for flexible structures like question options and practice drill choices, achieving all the benefits of a document store without polyglot database complexity.
3. **Row-Level Security (RLS)**: PostgreSQL enforces data isolation directly at the database engine level based on `auth.uid()`, preventing cross-tenant data leaks.
4. **Architectural Simplicity**: Running two primary databases (PostgreSQL + MongoDB) doubles operational complexity, maintenance overhead, and latency.

### Why Supabase is the Primary Database
- **Unified Backend Service**: Supabase natively bundles PostgreSQL, Authentication, and S3-compatible Blob Storage.
- **Single Auth Authority**: Supabase Auth securely manages user identities, refresh tokens, and JWT issuance without requiring custom, vulnerable auth logic.

### Why the Python RAG Microservice Remains Separate
- **Python Ecosystem Dominance**: The leading libraries for PDF text extraction (`pypdf`), semantic chunking, embeddings (`sentence-transformers`, `gemini-embedding-001`), and local vector search (`chromadb`, `faiss`) are native to Python.
- **Compute Isolation**: Vector search and high-throughput embedding calculations are CPU/GPU-bound tasks. Isolating them in an independent FastAPI microservice prevents blocking the event loop of the Node.js I/O server.
- **Swappable AI Backend**: The Node.js application layer communicates with Python over a strictly typed HTTP contract, allowing the AI layer to scale, migrate, or update independently.

---

## 3. End-to-End Request Flows

### A. Authentication Flow
1. **User Sign In**: User submits credentials to Supabase Auth from the React frontend.
2. **Token Issuance**: Supabase returns a JWT `access_token` and `refresh_token` stored securely in the browser.
3. **API Request**: When making calls to Node.js, the React API interceptor appends `Authorization: Bearer <access_token>`.
4. **Token Verification**: Node.js `authMiddleware` validates the token with `supabase.auth.getUser(token)`.
5. **Context Binding**: The verified user ID is bound to `req.user.id`. Client-provided user IDs are strictly ignored.

### B. PDF Document Upload & Ingestion Flow
1. **Storage Upload**: React uploads the original PDF directly to the private Supabase Storage bucket `study-documents` under `user_id/document_id/filename.pdf`.
2. **Metadata Registration**: React notifies the Node.js backend (`POST /api/documents`).
3. **PostgreSQL Record**: Node records document metadata in the `documents` table with status `pending`.
4. **Async RAG Dispatch**: Node asynchronously dispatches `POST /rag/process-document` to the Python RAG microservice.
5. **Text Extraction & Chunking**: Python extracts text page-by-page, generates sliding-window semantic chunks with rich metadata (`user_id`, `document_id`, `subject`, `chapter`, `page`, `chunk_id`).
6. **Vector Indexing**: Python calculates dense embeddings and indexes vectors in ChromaDB.
7. **Status Update**: Upon completion, Node updates the document status to `completed`.

### C. Test Submission & AI Mistake Diagnosis Flow
1. **Attempt Submission**: Student finishes a test in React and calls `POST /api/attempts/:id/complete`.
2. **Grading**: Node.js grades each answer against the correct answer key in the database and computes the overall percentage score.
3. **Wrong Answer Detection**: Incorrect answers are identified.
4. **RAG Context Retrieval**: For each error, Node invokes Python `POST /rag/analyze-mistake`.
5. **Tenant-Isolated Search**: Python queries ChromaDB using `where={"user_id": user_id}` so only the student's authorized study materials are searched.
6. **Gemini Diagnostic Prompting**: Retrieved textbook context, the question, student answer, and correct answer are supplied to `gemini-3.8-flash`.
7. **Structured Validation**: Gemini outputs structured JSON categorizing the error (`conceptual`, `careless`, `time_pressure`, `memory`, `calculation`), explaining the discrepancy, and generating adaptive practice drills.
8. **Storage & Feedback**: Node saves the mistake, insight, and practice questions in PostgreSQL, returning the complete diagnostic report to React.

---

## 4. Security & Tenant Isolation Model

| Surface | Protection Mechanism |
|---|---|
| **Client Secrets** | React only has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are never exposed to the frontend. |
| **API Endpoints** | All protected routes require a valid Supabase JWT Bearer token. |
| **Data Ownership** | Every controller and repository explicitly enforces `auth.uid() = user_id`. |
| **Cross-Tenant Test** | Automated test `tests/security.test.js` verifies User A receives 404 when querying User B's documents, attempts, mistakes, or insights. |
| **Network Security** | Helmet security headers enabled; strict CORS whitelist configured (no `*` in production); rate limiters prevent DDoS and credential stuffing. |
