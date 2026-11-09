import re
from typing import List, Dict, Any


class TextChunker:
    """
    Chunks extracted PDF text into semantically coherent segments with sliding-window overlap.
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(
        self,
        pages: List[Dict[str, Any]],
        metadata_base: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        chunks = []
        chunk_idx = 0

        for page_data in pages:
            page_num = page_data["page"]
            text = page_data["text"]

            # Clean and normalize text
            cleaned_text = re.sub(r'\s+', ' ', text).strip()
            if not cleaned_text:
                continue

            # Split into word windows
            words = cleaned_text.split()
            if not words:
                continue

            start = 0
            while start < len(words):
                end = min(start + self.chunk_size, len(words))
                chunk_words = words[start:end]
                chunk_text = " ".join(chunk_words)

                chunk_id = f"{metadata_base.get('document_id', 'doc')}_p{page_num}_c{chunk_idx}"
                chunk_meta = {
                    **metadata_base,
                    "page": page_num,
                    "chunk_id": chunk_id,
                }

                chunks.append({
                    "id": chunk_id,
                    "text": chunk_text,
                    "metadata": chunk_meta,
                })

                chunk_idx += 1
                if end == len(words):
                    break
                start += max(1, self.chunk_size - self.chunk_overlap)

        return chunks
