import numpy as np
from app.rag.vector_store import FAISSVectorStore


def test_vector_store_search(tmp_path):
    store = FAISSVectorStore(str(tmp_path))

    embeddings = np.array(
        [
            [1.0, 0.0],
            [0.0, 1.0],
        ],
        dtype="float32",
    )

    chunks = [
        {
            "id": "a",
            "text": "biology",
            "source": "a.pdf",
            "page": 1,
            "subject": "Biology",
            "chapter": "Genetics",
            "topic": "Genes",
            "exam": "NEET",
        },
        {
            "id": "b",
            "text": "chemistry",
            "source": "b.pdf",
            "page": 1,
            "subject": "Chemistry",
            "chapter": "Mole Concept",
            "topic": "Moles",
            "exam": "JEE",
        },
    ]

    store.add(embeddings, chunks)

    results = store.search(np.array([1.0, 0.0]), top_k=1)

    assert results[0][0]["id"] == "a"
