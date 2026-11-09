from typing import List
import hashlib
import numpy as np
from app.core.config import settings


class EmbeddingGenerator:
    """
    Generates dense embeddings for text chunks and queries.
    Uses sentence-transformers locally with a fast, deterministic fallback.
    """

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self._model = None
        self._dimension = 384
        self._load_model()

    def _load_model(self):
        try:
            import os
            os.environ["HF_HUB_OFFLINE"] = "1"
            os.environ["TRANSFORMERS_OFFLINE"] = "1"
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name, local_files_only=True)
            self._dimension = self._model.get_sentence_embedding_dimension()
        except Exception as e:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                self._dimension = self._model.get_sentence_embedding_dimension()
            except Exception as e2:
                print(f"[EmbeddingGenerator] Local sentence-transformers model not loaded: {e2}. Using deterministic semantic hash fallback.")
                self._model = None

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self._model is not None:
            embeddings = self._model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
            return embeddings.tolist()
        else:
            return [self._fallback_embed(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        if self._model is not None:
            embedding = self._model.encode([text], show_progress_bar=False, normalize_embeddings=True)
            return embedding[0].tolist()
        else:
            return self._fallback_embed(text)

    def _fallback_embed(self, text: str) -> List[float]:
        # Generate 384-dimensional deterministic vector from text
        vec = np.zeros(self._dimension, dtype=np.float32)
        words = text.lower().split()
        for idx, word in enumerate(words):
            h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
            slot = h % self._dimension
            vec[slot] += 1.0 / (idx + 1)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec.tolist()
