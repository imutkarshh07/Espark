from typing import List, Optional
from pydantic import BaseModel, Field


class Source(BaseModel):
    chunk_id: str
    document: str
    page: int
    subject: str
    chapter: str
    topic: str
    exam: str
    score: float


class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    subject: Optional[str] = None
    chapter: Optional[str] = None
    topic: Optional[str] = None
    exam: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=10)


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]


class MistakeAnalysisRequest(BaseModel):
    question: str
    student_answer: str
    correct_answer: str
    subject: str
    chapter: str
    topic: str
    question_type: Optional[str] = None
    previous_mistakes: List[str] = []


class MistakeAnalysisResponse(BaseModel):
    category: str
    trap_pattern: str
    explanation: str
    correct_concept: str
    recommendation: str
    practice_focus: List[str]
    confidence: float
    sources: List[Source]
