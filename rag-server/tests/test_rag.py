import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.vector_store import ChromaVectorStore
from app.services.gemini_service import GeminiService

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "service" in data


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
