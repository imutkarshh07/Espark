# Study Insights API Reference Manual

Base URLs:
- **Node.js Main Backend**: `http://localhost:5000/api`
- **Python RAG Microservice**: `http://localhost:8000`

---

## 1. Node.js Backend API

All protected endpoints require the following header:
```http
Authorization: Bearer <supabase_access_token>
```

### Standard Response Formats

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Document not found or access denied."
  }
}
```

---

### System & Health

#### `GET /api/health`
Checks overall status of the Node API and dependent microservices.
- **Auth:** Public
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "status": "online",
      "version": "1.0.0",
      "environment": "development",
      "services": {
        "database": "configured",
        "ragServer": "ok"
      },
      "timestamp": "2026-09-19T11:45:00.000Z"
    }
  }
  ```

---

### Profile Management

#### `GET /api/profile`
Retrieves the profile of the authenticated student.
- **Auth:** Required

#### `PATCH /api/profile`
Updates profile information.
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "Alex Morgan",
    "class": "Class 12",
    "exam": "JEE Advanced"
  }
  ```

---

### Documents & Study Notes

#### `GET /api/documents`
Lists all study documents uploaded by the authenticated user.

#### `POST /api/documents`
Registers document metadata and queues RAG ingestion.
- **Body:**
  ```json
  {
    "file_name": "Kinematics_Chapter_1.pdf",
    "storage_path": "user-uuid/doc-uuid/Kinematics_Chapter_1.pdf",
    "file_size": 2048500,
    "mime_type": "application/pdf",
    "subject": "Physics",
    "chapter": "Kinematics"
  }
  ```

#### `GET /api/documents/:id`
Retrieves single document metadata.

#### `DELETE /api/documents/:id`
Deletes the document from PostgreSQL and Supabase Storage.

---

### Tests & Questions

#### `GET /api/tests`
Lists available diagnostic assessments for the student.

#### `POST /api/tests`
Creates a test with embedded questions.
- **Body:**
  ```json
  {
    "title": "Thermodynamics Diagnostics",
    "subject": "Physics",
    "chapter": "Heat & Thermodynamics",
    "questions": [
      {
        "question_text": "In an adiabatic process, what remains zero?",
        "options": ["Heat exchange (Q=0)", "Work done (W=0)", "Internal energy change (dU=0)", "Pressure change"],
        "correct_answer": "Heat exchange (Q=0)",
        "explanation": "Adiabatic definition entails no heat exchange across boundaries.",
        "topic": "First Law",
        "difficulty": "medium"
      }
    ]
  }
  ```

#### `GET /api/tests/:id`
Returns test details and its questions.

#### `DELETE /api/tests/:id`
Deletes a test owned by the authenticated user.

---

### Test Attempts & Grading

#### `POST /api/tests/:id/start`
Starts a new attempt session.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "attempt-uuid",
      "test_id": "test-uuid",
      "started_at": "2026-09-19T11:45:00.000Z"
    }
  }
  ```

#### `POST /api/attempts/:id/answers`
Submits a single answer during the quiz.
- **Body:**
  ```json
  {
    "question_id": "question-uuid",
    "selected_answer": "Heat exchange (Q=0)",
    "time_taken": 45
  }
  ```

#### `POST /api/attempts/:id/complete`
Submits and grades the attempt, calculates score percentage, and triggers RAG mistake diagnosis for incorrect answers.
- **Body (optional batch answers):**
  ```json
  {
    "answers": [
      {
        "question_id": "question-uuid",
        "selected_answer": "Option A",
        "time_taken": 30
      }
    ]
  }
  ```

---

### Mistakes & Insights

#### `GET /api/mistakes`
Lists mistakes. Supports query filtering: `?category=conceptual`.

#### `GET /api/mistakes/:id`
Retrieves a single mistake with associated AI insight and practice questions.

#### `GET /api/insights`
Lists AI insights.

#### `GET /api/insights/:id`
Retrieves a specific cognitive diagnosis.

---

## 2. Python RAG Microservice API

Internal RPC endpoints invoked by the Node.js backend.

### `GET /health`
Returns microservice health and vector store status.

### `POST /rag/process-document`
- **Body:**
  ```json
  {
    "user_id": "student-uuid",
    "document_id": "doc-uuid",
    "storage_path": "path/in/supabase",
    "file_name": "notes.pdf",
    "subject": "Physics",
    "chapter": "Motion"
  }
  ```

### `POST /rag/analyze-mistake`
- **Body:**
  ```json
  {
    "user_id": "student-uuid",
    "document_ids": ["doc-uuid"],
    "mistake": {
      "question": "What is the unit of electric current?",
      "student_answer": "Volt",
      "correct_answer": "Ampere",
      "topic": "Current Electricity",
      "subject": "Physics",
      "chapter": "Circuits"
    }
  }
  ```
- **Response:**
  ```json
  {
    "category": "conceptual",
    "confidence": 0.88,
    "reason": "Confused electric potential with rate of charge flow.",
    "explanation": "Volts measure potential difference, whereas Amperes measure current (Coulombs per second).",
    "recommended_action": "Review the fundamental definitions in Chapter 3.",
    "practice_questions": [
      {
        "question_text": "Which formula defines electric current?",
        "options": ["I = Q / t", "I = V * R", "I = W / Q", "I = F * d"],
        "correct_answer": "I = Q / t",
        "explanation": "Current is defined as the rate of flow of electric charge."
      }
    ],
    "sources": [
      {
        "document_id": "doc-uuid",
        "file_name": "notes.pdf",
        "page": 2,
        "score": 0.91,
        "excerpt": "Electric current is the rate of flow of charge through any cross-section..."
      }
    ]
  }
  ```
