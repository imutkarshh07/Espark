from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pathlib import Path
import os
import json


class VectorStore(ABC):
    """
    Abstract base class for vector store operations.
    Allows seamless swapping between ChromaDB and future Supabase pgvector
    without modifying application RAG workflows.
    """

    @abstractmethod
    def add_documents(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
    ) -> None:
        """Add vectorized document chunks to the store with tenant metadata."""
        pass

    @abstractmethod
    def query(
        self,
        query_embedding: List[float],
        user_id: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query the vector store.
        MANDATORY: Always enforces user_id isolation so User A cannot read User B documents.
        """
        pass

    @abstractmethod
    def delete_document(self, user_id: str, document_id: str) -> None:
        """Delete all chunks belonging to a document under user_id."""
        pass

    @abstractmethod
    def count_user_chunks(self, user_id: str) -> int:
        """Count indexed chunks belonging to a specific user."""
        pass


class ChromaVectorStore(VectorStore):
    """
    ChromaDB implementation of the VectorStore interface.
    Persists data locally in chroma_path and enforces user_id tenant filtering.
    """

    def __init__(self, persist_directory: str = "./data/chroma", collection_name: str = "study_insights_documents"):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self._client = None
        self._collection = None
        self._init_chroma()

    def _init_chroma(self):
        Path(self.persist_directory).mkdir(parents=True, exist_ok=True)
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            self._client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            print(f"[ChromaVectorStore] Initializing in fallback in-memory mode: {e}")
            # In-memory dictionary fallback for environments where chromadb binary build is missing
            self._fallback_store = []

    def add_documents(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
    ) -> None:
        if self._collection is not None:
            self._collection.upsert(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )
        else:
            for text, emb, meta, doc_id in zip(texts, embeddings, metadatas, ids):
                self._fallback_store.append({
                    "id": doc_id,
                    "text": text,
                    "embedding": emb,
                    "metadata": meta,
                })

    def query(
        self,
        query_embedding: List[float],
        user_id: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        # Enforce user_id tenant isolation
        conditions: List[Dict[str, Any]] = [{"user_id": user_id}]
        if filters:
            for k, v in filters.items():
                if v is not None:
                    conditions.append({k: v})

        where_clause: Dict[str, Any] = conditions[0] if len(conditions) == 1 else {"$and": conditions}

        if self._collection is not None:
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause,
                include=["documents", "metadatas", "distances"],
            )

            hits = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

                for doc, meta, dist in zip(docs, metas, dists):
                    similarity = max(0.0, 1.0 - dist)  # Cosine distance to similarity
                    hits.append({
                        "text": doc,
                        "metadata": meta,
                        "score": round(similarity, 4),
                    })
            return hits
        else:
            # Fallback simple search
            matching = [item for item in self._fallback_store if item["metadata"].get("user_id") == user_id]
            hits = []
            for item in matching[:top_k]:
                hits.append({
                    "text": item["text"],
                    "metadata": item["metadata"],
                    "score": 0.85,
                })
            return hits

    def delete_document(self, user_id: str, document_id: str) -> None:
        if self._collection is not None:
            self._collection.delete(
                where={"$and": [{"user_id": user_id}, {"document_id": document_id}]}
            )
        else:
            self._fallback_store = [
                item for item in self._fallback_store
                if not (item["metadata"].get("user_id") == user_id and item["metadata"].get("document_id") == document_id)
            ]

    def count_user_chunks(self, user_id: str) -> int:
        if self._collection is not None:
            results = self._collection.get(where={"user_id": user_id})
            return len(results.get("ids", []))
        else:
            return sum(1 for item in self._fallback_store if item["metadata"].get("user_id") == user_id)


class SupabaseVectorStore(VectorStore):
    """
    Future implementation stub for Supabase PostgreSQL + pgvector.
    Can be seamlessly implemented by querying the `document_chunks` table with pgvector embeddings
    without altering any service or API logic.
    """

    def __init__(self, supabase_url: str = "", supabase_key: str = ""):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key

    def add_documents(self, texts, embeddings, metadatas, ids):
        raise NotImplementedError("Supabase pgvector migration is planned for future release.")

    def query(self, query_embedding, user_id, top_k = 5, filters = None):
        raise NotImplementedError("Supabase pgvector migration is planned for future release.")

    def delete_document(self, user_id, document_id):
        raise NotImplementedError("Supabase pgvector migration is planned for future release.")

    def count_user_chunks(self, user_id):
        raise NotImplementedError("Supabase pgvector migration is planned for future release.")
