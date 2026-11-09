from typing import Dict, Any, List, Optional
from app.rag.pipeline import RAGPipeline
from app.services.gemini_service import GeminiService


class MistakeAnalyzer:
    """
    Orchestrates retrieval of relevant study chunks for a student mistake,
    then queries Gemini for deep diagnostic synthesis and practice question generation.
    """

    def __init__(self, pipeline: RAGPipeline, gemini_service: Optional[GeminiService] = None):
        self.pipeline = pipeline
        self.gemini = gemini_service or GeminiService()

    def analyze_mistake(
        self,
        user_id: str,
        question: str,
        student_answer: str,
        correct_answer: str,
        topic: str = "General",
        subject: Optional[str] = None,
        chapter: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        # 1. Retrieve relevant study chunks (strictly filtered by user_id)
        retrieval_query = f"{topic} {question}"
        raw_chunks = self.pipeline.retrieve(
            user_id=user_id,
            query=retrieval_query,
            top_k=4,
            subject=subject,
            chapter=chapter,
        )

        # Filter by document_ids if provided
        if document_ids and len(document_ids) > 0:
            doc_set = set(document_ids)
            raw_chunks = [c for c in raw_chunks if c.get("metadata", {}).get("document_id") in doc_set]

        context_texts = [c["text"] for c in raw_chunks]

        # 2. Query Gemini for structured diagnosis
        diagnosis = self.gemini.analyze_mistake_with_context(
            question=question,
            student_answer=student_answer,
            correct_answer=correct_answer,
            topic=topic,
            context_chunks=context_texts,
        )

        # 3. Attach retrieved citation sources
        sources = []
        for c in raw_chunks:
            meta = c.get("metadata", {})
            sources.append({
                "document_id": meta.get("document_id", "unknown"),
                "file_name": meta.get("file_name", "document.pdf"),
                "page": meta.get("page", 1),
                "score": c.get("score", 0.0),
                "excerpt": c["text"][:150] + "...",
            })

        diagnosis["sources"] = sources
        return diagnosis
