import re


def chunk_pages(
    pages: list[dict],
    source: str,
    subject: str,
    chapter: str,
    topic: str,
    exam: str,
    chunk_size: int = 450,
    overlap: int = 80,
) -> list[dict]:
    """
    Chunk each PDF page using word windows while preserving source metadata.
    This is intentionally simple and predictable for the first RAG server.
    """
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")

    chunks = []

    for page in pages:
        words = re.findall(r"\S+", page["text"])

        start = 0
        chunk_number = 0

        while start < len(words):
            end = min(start + chunk_size, len(words))
            text = " ".join(words[start:end]).strip()

            if text:
                chunks.append({
                    "id": f"{source}-p{page['page']}-c{chunk_number}",
                    "text": text,
                    "source": source,
                    "page": page["page"],
                    "subject": subject,
                    "chapter": chapter,
                    "topic": topic,
                    "exam": exam,
                })

            if end >= len(words):
                break

            start = end - overlap
            chunk_number += 1

    return chunks
