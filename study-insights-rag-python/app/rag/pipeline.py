from app.models.schemas import QueryRequest, QueryResponse, Source
from app.rag.chunker import chunk_pages
from app.rag.document_loader import extract_pdf_pages
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import FAISSVectorStore
from app.rag.generator import LLMGenerator


class RAGPipeline:
    def __init__(self):
        self.embeddings = EmbeddingService()
        self.store = FAISSVectorStore()
        self.generator = LLMGenerator()

    @property
    def chunk_count(self):
        return self.store.count

    def ingest_pdf(
        self,
        pdf_path: str,
        source: str,
        subject: str,
        chapter: str,
        topic: str,
        exam: str,
    ):
        pages = extract_pdf_pages(pdf_path)

        if not pages:
            raise ValueError("No readable text was found in the PDF.")

        chunks = chunk_pages(
            pages=pages,
            source=source,
            subject=subject,
            chapter=chapter,
            topic=topic,
            exam=exam,
        )

        if not chunks:
            raise ValueError("No chunks were created from the PDF.")

        embeddings = self.embeddings.encode_documents(
            [chunk["text"] for chunk in chunks]
        )

        self.store.add(embeddings, chunks)

        return {
            "status": "indexed",
            "source": source,
            "pages": len(pages),
            "chunks_added": len(chunks),
            "total_chunks": self.store.count,
        }

    def retrieve(self, request: QueryRequest):
        query_embedding = self.embeddings.encode_query(request.query)

        # Retrieve a larger candidate set, then apply metadata filters.
        candidates = self.store.search(
            query_embedding,
            top_k=max(request.top_k * 3, 10),
        )

        filtered = []

        for chunk, score in candidates:
            if request.subject and chunk["subject"].lower() != request.subject.lower():
                continue
            if request.chapter and chunk["chapter"].lower() != request.chapter.lower():
                continue
            if request.topic and chunk["topic"].lower() != request.topic.lower():
                continue
            if request.exam and chunk["exam"].lower() != request.exam.lower():
                continue

            filtered.append((chunk, score))

        # If strict metadata filtering leaves nothing, fall back to semantic results.
        results = filtered if filtered else candidates
        return results[:request.top_k]

    def query(self, request: QueryRequest) -> QueryResponse:
        results = self.retrieve(request)

        if not results:
            raise ValueError("No relevant study material has been indexed yet.")

        context_parts = []

        for chunk, score in results:
            context_parts.append(
                f"""SOURCE: {chunk['source']}
PAGE: {chunk['page']}
SUBJECT: {chunk['subject']}
CHAPTER: {chunk['chapter']}
TOPIC: {chunk['topic']}
CONTENT:
{chunk['text']}"""
            )

        context = "\n\n---\n\n".join(context_parts)
        generated = self.generator.answer(request.query, context)

        sources = [
            Source(
                chunk_id=chunk["id"],
                document=chunk["source"],
                page=chunk["page"],
                subject=chunk["subject"],
                chapter=chunk["chapter"],
                topic=chunk["topic"],
                exam=chunk["exam"],
                score=score,
            )
            for chunk, score in results
        ]

        return QueryResponse(
            answer=generated.answer,
            sources=sources,
        )
