from typing import List, Dict, Any, Optional
from pathlib import Path
from app.rag.document_loader import PDFDocumentLoader
from app.rag.chunker import TextChunker
from app.embeddings.generator import EmbeddingGenerator
from app.core.vector_store import VectorStore, ChromaVectorStore, SupabaseVectorStore
from app.core.config import settings


def _create_default_vector_store() -> VectorStore:
    # If Supabase URL and service key are provided, use pgvector for persistent cloud storage
    if (
        settings.SUPABASE_URL
        and "placeholder" not in settings.SUPABASE_URL
        and settings.SUPABASE_SERVICE_ROLE_KEY
        and "your-supabase" not in settings.SUPABASE_SERVICE_ROLE_KEY
    ):
        try:
            return SupabaseVectorStore(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
            )
        except Exception as e:
            print(f"[RAGPipeline] SupabaseVectorStore init failed, falling back to Chroma: {e}")

    return ChromaVectorStore(
        persist_directory=settings.CHROMA_PATH,
        collection_name=settings.COLLECTION_NAME,
    )


class RAGPipeline:
    """
    Core RAG Pipeline: Ingests documents, indexes vectors, and performs tenant-isolated retrieval.
    """

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.loader = PDFDocumentLoader()
        self.chunker = TextChunker()
        self.embedder = EmbeddingGenerator()
        self.vector_store = vector_store or _create_default_vector_store()

    def ingest_pdf_file(
        self,
        file_path_or_bytes,
        user_id: str,
        document_id: str,
        file_name: str,
        subject: str = "General",
        chapter: str = "General",
    ) -> Dict[str, Any]:
        """Loads, chunks, embeds, and stores a PDF document."""
        # 1. Extract pages
        pages = self.loader.load_pdf(file_path_or_bytes)
        if not pages:
            return {"status": "empty", "chunks_indexed": 0}

        # 2. Chunk text with metadata
        metadata_base = {
            "user_id": user_id,
            "document_id": document_id,
            "file_name": file_name,
            "subject": subject,
            "chapter": chapter,
        }
        chunks = self.chunker.chunk_document(pages, metadata_base)
        if not chunks:
            return {"status": "empty", "chunks_indexed": 0}

        # 3. Generate embeddings
        texts = [c["text"] for c in chunks]
        embeddings = self.embedder.embed_texts(texts)
        metadatas = [c["metadata"] for c in chunks]
        ids = [c["id"] for c in chunks]

        # 4. Store in vector store
        self.vector_store.add_documents(texts, embeddings, metadatas, ids)

        return {
            "status": "completed",
            "document_id": document_id,
            "chunks_indexed": len(chunks),
            "pages": len(pages),
        }

    def retrieve(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
        subject: Optional[str] = None,
        chapter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves relevant document chunks strictly matching user_id.
        """
        query_embedding = self.embedder.embed_query(query)
        filters = {}
        if subject:
            filters["subject"] = subject
        if chapter:
            filters["chapter"] = chapter

        return self.vector_store.query(
            query_embedding=query_embedding,
            user_id=user_id,
            top_k=top_k,
            filters=filters if filters else None,
        )
