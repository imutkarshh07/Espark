import base64
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.vector_store import ChromaVectorStore
from app.api import router as rag_router
from app.services.gemini_service import GeminiService, GeminiServiceError

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "service" in data
    assert isinstance(data["gemini_key_configured"], bool)


def test_vector_store_tenant_isolation():
    store = ChromaVectorStore(persist_directory="./data/test_chroma", collection_name="test_isolation")

    # Add chunk for User A
    store.add_documents(
        texts=["User A private physics notes on Newton's laws"],
        embeddings=[[0.1] * 384],
        metadatas=[{"user_id": "user_a", "document_id": "doc_a", "subject": "Physics"}],
        ids=["chunk_a_1"]
    )

    # Add chunk for User B
    store.add_documents(
        texts=["User B confidential biology notes on genetics and alleles"],
        embeddings=[[0.1] * 384],
        metadatas=[{"user_id": "user_b", "document_id": "doc_b", "subject": "Biology"}],
        ids=["chunk_b_1"]
    )

    # Query as User A: User A must NEVER see User B's chunk
    results_a = store.query(
        query_embedding=[0.1] * 384,
        user_id="user_a",
        top_k=5
    )
    for hit in results_a:
        assert hit["metadata"]["user_id"] == "user_a"
        assert hit["metadata"]["document_id"] != "doc_b"

    # Query as User B: User B must NEVER see User A's chunk
    results_b = store.query(
        query_embedding=[0.1] * 384,
        user_id="user_b",
        top_k=5
    )
    for hit in results_b:
        assert hit["metadata"]["user_id"] == "user_b"
        assert hit["metadata"]["document_id"] != "doc_a"


def test_mistake_analyzer_endpoint():
    payload = {
        "user_id": "student_test_1",
        "document_ids": [],
        "mistake": {
            "question": "What is the speed of light in vacuum?",
            "student_answer": "300,000 km/h",
            "correct_answer": "300,000 km/s",
            "topic": "Electromagnetism",
            "subject": "Physics",
            "chapter": "Light"
        }
    }
    response = client.post("/rag/analyze-mistake", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "category" in data
    assert data["category"] in ["conceptual", "careless", "time_pressure", "memory", "calculation"]
    assert "confidence" in data
    assert "reason" in data
    assert "explanation" in data
    assert "practice_questions" in data
    assert len(data["practice_questions"]) > 0


def test_ask_doubt_rejects_empty_question():
    response = client.post("/rag/ask-doubt", json={"user_id": "student-1", "query": " "})
    assert response.status_code == 422


def test_ask_doubt_rejects_invalid_base64_attachment(monkeypatch):
    monkeypatch.setattr(rag_router.rag_pipeline, "retrieve", lambda **kwargs: [])
    response = client.post(
        "/rag/ask-doubt",
        json={
            "user_id": "student-1",
            "query": "What is shown?",
            "file_content": "not-base64!",
            "file_name": "question.png",
            "file_type": "image/png",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Attachment data is not valid base64."


@pytest.mark.parametrize(
    "payload",
    [
        {"query": "Explain osmosis", "subject": "Biology"},
        {"query": "Explain osmosis", "subject": "Auto-Detect"},
        {
            "query": "What is shown?",
            "file_content": "aGVsbG8=",
            "file_name": "gallery.png",
            "file_type": "image/png",
        },
        {
            "query": "What is shown?",
            "file_content": "aGVsbG8=",
            "file_name": "camera.jpg",
            "file_type": "image/jpeg",
        },
        {
            "query": "Summarize this page",
            "file_content": "JVBERi0xLjQ=",
            "file_name": "notes.pdf",
            "file_type": "application/pdf",
        },
    ],
)
def test_ask_doubt_forwards_text_subject_and_attachments(monkeypatch, payload):
    captured = {}
    monkeypatch.setattr(rag_router.rag_pipeline, "retrieve", lambda **kwargs: [])

    def fake_solve_doubt(**kwargs):
        captured.update(kwargs)
        return {
            "answer": "Genuine generated answer from the test model.",
            "key_takeaways": [],
            "suggested_followups": [],
            "confidence": 0.9,
        }

    monkeypatch.setattr(rag_router.gemini_service, "solve_doubt", fake_solve_doubt)
    if payload.get("file_type") == "application/pdf":
        monkeypatch.setattr(
            rag_router.rag_pipeline.loader,
            "load_pdf",
            lambda _: [{"page": 1, "text": "Test PDF text"}],
        )

    response = client.post(
        "/rag/ask-doubt",
        json={"user_id": "student-1", **payload},
    )

    assert response.status_code == 200
    assert response.json()["answer"] == "Genuine generated answer from the test model."
    assert captured["query"] == payload["query"]
    if payload.get("file_content"):
        assert captured["file_bytes"] == base64.b64decode(payload["file_content"])
        assert captured["file_mime_type"] == payload["file_type"]


def test_ask_doubt_returns_provider_configuration_error(monkeypatch):
    monkeypatch.setattr(rag_router.rag_pipeline, "retrieve", lambda **kwargs: [])

    def raise_not_configured(**kwargs):
        raise GeminiServiceError(
            503,
            "AI_PROVIDER_NOT_CONFIGURED",
            "The AI service is not configured. Please contact support.",
        )

    monkeypatch.setattr(rag_router.gemini_service, "solve_doubt", raise_not_configured)
    response = client.post(
        "/rag/ask-doubt",
        json={"user_id": "student-1", "query": "Explain osmosis"},
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AI_PROVIDER_NOT_CONFIGURED"
