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
    Supabase PostgreSQL + pgvector cloud implementation.
    Persists vectorized document chunks in Supabase `document_chunks` table,
    surviving any Render container spin-downs or restarts.
    """

    def __init__(self, supabase_url: str = "", supabase_key: str = ""):
        from app.core.config import settings
        self.supabase_url = (supabase_url or settings.SUPABASE_URL).rstrip("/")
        self.supabase_key = supabase_key or settings.SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal,resolution=merge-duplicates",
        }

    def add_documents(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
    ) -> None:
        import httpx
        rows = []
        for text, emb, meta, doc_id in zip(texts, embeddings, metadatas, ids):
            raw_doc_id = meta.get("document_id")
            valid_doc_id = raw_doc_id if (raw_doc_id and "-" in str(raw_doc_id)) else None
            raw_user_id = meta.get("user_id")
            valid_user_id = raw_user_id if (raw_user_id and "-" in str(raw_user_id)) else "00000000-0000-0000-0000-000000000001"
            rows.append({
                "id": str(doc_id),
                "document_id": valid_doc_id,
                "user_id": valid_user_id,
                "chunk_index": int(meta.get("chunk_index", 0)),
                "text": text,
                "embedding": emb,
                "metadata": meta,
            })

        if not rows:
            return

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{self.supabase_url}/rest/v1/document_chunks",
                    headers=self.headers,
                    json=rows,
                )
                if resp.status_code >= 400:
                    print(f"[SupabaseVectorStore] Failed to insert document chunks: {resp.text}")
        except Exception as e:
            print(f"[SupabaseVectorStore] Error inserting document chunks: {e}")

    def query(
        self,
        query_embedding: List[float],
        user_id: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        import httpx
        payload = {
            "query_embedding": query_embedding,
            "match_count": top_k,
            "filter_user_id": user_id if (user_id and "-" in str(user_id)) else None,
            "filter_subject": filters.get("subject") if filters else None,
            "filter_chapter": filters.get("chapter") if filters else None,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{self.supabase_url}/rest/v1/rpc/match_document_chunks",
                    headers=self.headers,
                    json=payload,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    hits = []
                    for item in data:
                        hits.append({
                            "text": item.get("text", ""),
                            "metadata": item.get("metadata", {}),
                            "score": round(float(item.get("similarity", 0.85)), 4),
                        })
                    return hits
                else:
                    print(f"[SupabaseVectorStore] RPC query failed: {resp.text}")
                    return []
        except Exception as e:
            print(f"[SupabaseVectorStore] Error executing query: {e}")
            return []

    def delete_document(self, user_id: str, document_id: str) -> None:
        import httpx
        try:
            with httpx.Client(timeout=15.0) as client:
                client.delete(
                    f"{self.supabase_url}/rest/v1/document_chunks?user_id=eq.{user_id}&document_id=eq.{document_id}",
                    headers=self.headers,
                )
        except Exception as e:
            print(f"[SupabaseVectorStore] Error deleting document: {e}")

    def count_user_chunks(self, user_id: str) -> int:
        import httpx
        try:
            headers = {**self.headers, "Prefer": "count=exact"}
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(
                    f"{self.supabase_url}/rest/v1/document_chunks?user_id=eq.{user_id}&select=id",
                    headers=headers,
                )
                content_range = resp.headers.get("content-range", "")
                if "/" in content_range:
                    try:
                        return int(content_range.split("/")[1])
                    except Exception:
                        pass
                return len(resp.json()) if resp.status_code == 200 else 0
        except Exception as e:
            print(f"[SupabaseVectorStore] Error counting chunks: {e}")
            return 0
