from pathlib import Path
import json
import numpy as np
import faiss


class FAISSVectorStore:
    """
    Local FAISS store for the MVP.
    Later, this can be replaced with PostgreSQL + pgvector
    without changing the API layer.
    """

    def __init__(self, index_dir: str = "indexes"):
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)

        self.index = None
        self.chunks: list[dict] = []
        self._load()

    @property
    def count(self) -> int:
        return len(self.chunks)

    def _load(self):
        index_path = self.index_dir / "faiss.index"
        metadata_path = self.index_dir / "chunks.json"

        if index_path.exists() and metadata_path.exists():
            self.index = faiss.read_index(str(index_path))
            self.chunks = json.loads(metadata_path.read_text(encoding="utf-8"))

    def add(self, embeddings: np.ndarray, chunks: list[dict]):
        embeddings = np.asarray(embeddings, dtype="float32")
        faiss.normalize_L2(embeddings)

        if self.index is None:
            self.index = faiss.IndexFlatIP(embeddings.shape[1])

        self.index.add(embeddings)
        self.chunks.extend(chunks)
        self.save()

    def search(self, embedding: np.ndarray, top_k: int = 5) -> list[tuple[dict, float]]:
        if self.index is None or not self.chunks:
            return []

        query = np.asarray(embedding, dtype="float32").reshape(1, -1)
        faiss.normalize_L2(query)

        k = min(top_k, len(self.chunks))
        scores, indices = self.index.search(query, k)

        results = []
        for score, index in zip(scores[0], indices[0]):
            if index >= 0:
                results.append((self.chunks[index], float(score)))

        return results

    def save(self):
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_dir / "faiss.index"))

        (self.index_dir / "chunks.json").write_text(
            json.dumps(self.chunks, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
