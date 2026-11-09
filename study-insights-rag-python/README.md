# Study Insights RAG Server

A first production-oriented RAG MVP for the Study Insights application.

## What changed from the original Medium script?

- FastAPI server instead of a one-off script
- PDF page boundaries are preserved
- Chunk metadata is preserved
- Chunk overlap is supported
- Embedding model loads once at server startup
- Normalized embeddings + FAISS inner-product search
- Metadata filtering by subject/chapter/topic/exam
- Candidate retrieval before filtering
- Source/page citations in API responses
- Structured OpenAI outputs with Pydantic
- Study Insights-specific mistake analysis endpoint
- Persistent local FAISS index + chunk metadata
- Environment-based configuration
- Health endpoint
- Clear separation between ingestion, retrieval, generation and API

## 1. Install

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## 2. Configure OpenAI

Copy:

```text
.env.example
```

to:

```text
.env
```

Then add your API key.

Do NOT commit `.env`.

## 3. Start the server

```bash
uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

## 4. Index a PDF

Use the `/documents` endpoint.

Example metadata:

```text
subject = Biology
chapter = Genetics
topic = Mendelian Inheritance
exam = NEET
```

## 5. Query

POST `/rag/query`:

```json
{
  "query": "What is Mendel's law of segregation?",
  "subject": "Biology",
  "chapter": "Genetics",
  "topic": "Mendelian Inheritance",
  "exam": "NEET",
  "top_k": 5
}
```

## 6. Analyze a mistake

POST `/mistakes/analyze`:

```json
{
  "question": "Which term describes the genetic makeup of an organism?",
  "student_answer": "Phenotype",
  "correct_answer": "Genotype",
  "subject": "Biology",
  "chapter": "Genetics",
  "topic": "Genotype and Phenotype",
  "question_type": "Conceptual",
  "previous_mistakes": [
    "Confused genotype and phenotype"
  ]
}
```

The response contains:

- mistake category
- trap pattern
- explanation
- correct concept
- recommendation
- targeted practice focus
- confidence
- source citations

## Architecture

```text
                    Study Insights Android
                            |
                            v
                     Backend / API
                            |
                +-----------+-----------+
                |                       |
                v                       v
          Student Database          RAG Server
          PostgreSQL                |
          - attempts                +-- PDF ingestion
          - mistakes                +-- chunking
          - insights                +-- embeddings
          - progress                +-- FAISS
                                    +-- retrieval
                                    +-- metadata filters
                                    +-- LLM
                                         |
                                         v
                                  Structured result
```

## Important

FAISS is intentionally used for the first MVP.

When the product grows, replace the local FAISS store with PostgreSQL + pgvector. Keep the `FAISSVectorStore` interface isolated so the API does not need to change.

The server does not pretend to have knowledge it has not indexed. If the retrieval layer has no useful material, the application should report that clearly.
