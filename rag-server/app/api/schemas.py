from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class PracticeQuestion(BaseModel):
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None


class ProcessDocumentRequest(BaseModel):
    user_id: str = Field(min_length=1)
    document_id: str = Field(min_length=1)
    storage_path: Optional[str] = None
    file_name: str
    subject: Optional[str] = "General"
    chapter: Optional[str] = "General"


class ProcessDocumentResponse(BaseModel):
    status: str
    document_id: str
    chunks_indexed: int
    pages: int = 1


class MistakePayload(BaseModel):
    question: str
    student_answer: str
    correct_answer: str
    topic: Optional[str] = "General"
    subject: Optional[str] = "General"
    chapter: Optional[str] = "General"


class MistakeAnalysisRequest(BaseModel):
    user_id: str = Field(min_length=1)
    document_ids: Optional[List[str]] = Field(default_factory=list)
    mistake: MistakePayload


class SourceCitation(BaseModel):
    document_id: str
    file_name: str
    page: int
    score: float
    excerpt: str


class MistakeAnalysisResponse(BaseModel):
    category: str
    confidence: float
    reason: str
    explanation: str
    recommended_action: str
    practice_questions: List[PracticeQuestion] = Field(default_factory=list)
    sources: List[SourceCitation] = Field(default_factory=list)


class GeneratePracticeRequest(BaseModel):
    user_id: str = Field(min_length=1)
    topic: str
    difficulty: Optional[str] = "medium"
    count: Optional[int] = 3


class GeneratePracticeResponse(BaseModel):
    practice_questions: List[PracticeQuestion]


class GenerateQuestionsRequest(BaseModel):
    user_id: str = Field(min_length=1)
    exam: Optional[str] = "NEET"
    class_level: Optional[str] = "Class 12th"
    subjects: List[str] = Field(default_factory=list)
    chapters: Dict[str, str] = Field(default_factory=dict)
    subtopic: Optional[str] = None
    difficulty: Optional[str] = "all"
    count: int = Field(default=10, ge=3, le=150)
    excluded_questions: List[str] = Field(default_factory=list)


class GenerateQuestionsResponse(BaseModel):
    questions: List[PracticeQuestion]


class RAGQueryRequest(BaseModel):
    user_id: str = Field(min_length=1)
    query: str
    subject: Optional[str] = None
    chapter: Optional[str] = None
    top_k: Optional[int] = 5


class RAGQueryResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]]


class DoubtSolverRequest(BaseModel):
    user_id: str = Field(min_length=1)
    query: Optional[str] = "Please analyze and solve the question or diagram depicted here."
    subject: Optional[str] = "General"
    chapter: Optional[str] = "General"
    file_content: Optional[str] = None  # Text or base64 data
    file_name: Optional[str] = None
    file_type: Optional[str] = None  # pdf, txt, md, image/png, image/jpeg

    @field_validator('query', mode='before')
    @classmethod
    def default_query_if_empty(cls, v: Any) -> str:
        if v is None or (isinstance(v, str) and not v.strip()):
            return "Please analyze and solve the question or diagram depicted here."
        return str(v).strip()


class DoubtSolverResponse(BaseModel):
    answer: str
    sources: List[SourceCitation] = Field(default_factory=list)
    key_takeaways: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    confidence: float = 0.90

