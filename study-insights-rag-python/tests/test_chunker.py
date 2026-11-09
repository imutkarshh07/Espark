from app.rag.chunker import chunk_pages


def test_chunker_preserves_page_metadata():
    pages = [{"page": 7, "text": "word " * 600}]

    chunks = chunk_pages(
        pages,
        source="biology.pdf",
        subject="Biology",
        chapter="Genetics",
        topic="Inheritance",
        exam="NEET",
        chunk_size=100,
        overlap=20,
    )

    assert len(chunks) > 1
    assert all(chunk["page"] == 7 for chunk in chunks)
    assert all(chunk["subject"] == "Biology" for chunk in chunks)
