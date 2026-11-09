from openai import OpenAI
from pydantic import BaseModel
import os

from app.models.schemas import MistakeAnalysisRequest, MistakeAnalysisResponse, Source


class MistakeOutput(BaseModel):
    category: str
    trap_pattern: str
    explanation: str
    correct_concept: str
    recommendation: str
    practice_focus: list[str]
    confidence: float


class MistakeAnalyzer:
    """
    Study Insights-specific layer.
    It retrieves relevant educational context first, then asks the LLM
    to classify and explain the student's mistake.
    """

    def __init__(self, pipeline):
        self.pipeline = pipeline
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")

    def analyze(self, request: MistakeAnalysisRequest):
        from app.models.schemas import QueryRequest

        retrieval_query = (
            f"Explain the concept needed to solve this question. "
            f"Question: {request.question}. "
            f"Student answer: {request.student_answer}. "
            f"Correct answer: {request.correct_answer}."
        )

        results = self.pipeline.retrieve(
            QueryRequest(
                query=retrieval_query,
                subject=request.subject,
                chapter=request.chapter,
                topic=request.topic,
                top_k=5,
            )
        )

        context = "\n\n---\n\n".join(
            f"SOURCE: {chunk['source']}\n"
            f"PAGE: {chunk['page']}\n"
            f"TOPIC: {chunk['topic']}\n"
            f"CONTENT:\n{chunk['text']}"
            for chunk, _ in results
        )

        prompt = f"""
Analyze the student's mistake using the supplied study material.

Student question:
{request.question}

Student answer:
{request.student_answer}

Correct answer:
{request.correct_answer}

Subject:
{request.subject}

Chapter:
{request.chapter}

Topic:
{request.topic}

Question type:
{request.question_type or "Unknown"}

Previous related mistakes:
{request.previous_mistakes}

Study material:
{context}

Allowed initial mistake categories:
- Conceptual
- Careless
- Time Pressure
- Memory
- Calculation

Return a practical diagnosis. Do not invent a scientific explanation.
If the evidence is insufficient, keep the diagnosis conservative.
"""

        response = self.client.responses.parse(
            model=self.model,
            input=[
                {
                    "role": "developer",
                    "content": "You are the mistake-analysis engine for Study Insights."
                },
                {"role": "user", "content": prompt},
            ],
            text_format=MistakeOutput,
        )

        parsed = getattr(response, "output_parsed", None)
        if parsed is None:
            parsed = MistakeOutput.model_validate_json(response.output_text)

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

        return MistakeAnalysisResponse(
            **parsed.model_dump(),
            sources=sources,
        )
