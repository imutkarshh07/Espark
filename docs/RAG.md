# Retrieval-Augmented Generation (RAG) Architecture & Mistake Diagnosis

This document outlines the design, chunking strategy, vector store abstraction, multi-tenant isolation, and LLM diagnostic synthesis in **Study Insights**.

---

## 1. Pipeline Architecture

```text
Uploaded PDF 
   │
   ▼
[PDFDocumentLoader] ────► Page-by-page text extraction
   │
   ▼
[TextChunker] ──────────► Sliding window (500 words, 100-word overlap)
   │
   ▼
[EmbeddingGenerator] ───► Dense embeddings (384-dim normalized)
   │
   ▼
[VectorStore] ──────────► ChromaDB with tenant metadata
   │
   │  Mistake Trigger: Question + Student Answer + Correct Answer
   ▼
[Tenant-Isolated Query] ─► ChromaDB filtered by user_id
   │
   ▼
[Gemini Diagnostic Engine]► Prompt with retrieved excerpts (gemini-3.8-flash)
   │
   ▼
Structured JSON Output ──► Category, Root Cause, Explanation, Drills
```

---

## 2. Chunking & Indexing Strategy

- **Granularity**: 500 words with 100-word semantic overlap ensures definitions, equations, and explanations are not fractured across split boundaries.
- **Rich Metadata Enrichment**: Every chunk indexed in ChromaDB retains:
  - `user_id`: Mandatory for tenant isolation.
  - `document_id`: Relates to PostgreSQL document UUID.
  - `file_name`: Original PDF filename.
  - `subject`: Academic subject.
  - `chapter`: Specific curriculum chapter.
  - `page`: Page number in original PDF.
  - `chunk_id`: Unique chunk identifier.

---

## 3. Strict Multi-Tenant Isolation

> [!IMPORTANT]
> **Zero Cross-Tenant Leakage**: A student's private notes must never be accessible or retrievable by any other user.

ChromaDB enforces metadata filtering on every retrieval:
```python
results = collection.query(
    query_embeddings=[embedding],
    n_results=top_k,
    where={"user_id": user_id}  # Enforced tenant filter
)
```

The `tests/security.test.js` and `tests/test_standalone.py` automated suites explicitly verify that querying with `user_a` returns zero chunks belonging to `user_b`.

---

## 4. VectorStore Abstraction Layer

To ensure ChromaDB can later be migrated to **Supabase pgvector** without rewriting application services:

```python
class VectorStore(ABC):
    @abstractmethod
    def add_documents(self, texts, embeddings, metadatas, ids): pass

    @abstractmethod
    def query(self, query_embedding, user_id, top_k=5, filters=None): pass

    @abstractmethod
    def delete_document(self, user_id, document_id): pass

    @abstractmethod
    def count_user_chunks(self, user_id): pass
```

Implementations:
- `ChromaVectorStore`: Active production implementation utilizing local persistent ChromaDB.
- `SupabaseVectorStore`: Future migration target targeting PostgreSQL `document_chunks` with `vector(384)`.

---

## 5. Cognitive Mistake Taxonomy

The diagnostic engine classifies all wrong answers into five deterministic categories:

1. **`conceptual`**:
   - The student misunderstood an underlying principle, law, or theorem.
   - *Example*: Believing an object in uniform circular motion has zero acceleration.
2. **`careless`**:
   - The student knew the concept but made an oversight (misread question, forgot units).
   - *Example*: Answering in km/h instead of m/s.
3. **`time_pressure`**:
   - The student ran out of time and answered hastily or guessed.
4. **`memory`**:
   - The student forgot a specific constant, date, formula, or named exception.
   - *Example*: Forgetting the charge of an electron or a biological enzyme name.
5. **`calculation`**:
   - Mathematical, algebraic, or arithmetic sign error during solving.

---

## 6. Gemini Diagnostic Output Schema

Gemini responses are validated against the following JSON contract:

```json
{
  "category": "conceptual",
  "confidence": 0.88,
  "reason": "Student applied kinetic friction formula instead of static friction threshold.",
  "explanation": "Static friction adjusts up to a maximum limit (mu_s * N) before motion begins. Kinetic friction applies only during relative motion.",
  "recommended_action": "Practice drawing free-body diagrams for resting blocks on inclined planes.",
  "practice_questions": [
    {
      "question_text": "A 5kg block rests on a table with static friction coefficient 0.4. If an external horizontal force of 10N is applied, what is the friction force?",
      "options": ["10 N (Correct)", "19.6 N", "0 N", "5 N"],
      "correct_answer": "10 N (Correct)",
      "explanation": "Static friction opposes applied force exactly until reaching its maximum threshold (0.4 * 5 * 9.8 = 19.6 N)."
    }
  ]
}
```
