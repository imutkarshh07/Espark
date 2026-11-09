from fastapi import FastAPI, File, HTTPException, UploadFile
from pathlib import Path
import tempfile
import shutil

from app.models.schemas import QueryRequest, QueryResponse, MistakeAnalysisRequest, MistakeAnalysisResponse
from app.rag.pipeline import RAGPipeline
from app.rag.mistake_analyzer import MistakeAnalyzer

app = FastAPI(
    title="Study Insights RAG Server",
    version="0.1.0",
    description="Knowledge retrieval and mistake-analysis service for Study Insights."
)

pipeline = RAGPipeline()
mistake_analyzer = MistakeAnalyzer(pipeline)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "indexed_chunks": pipeline.chunk_count
    }


@app.post("/documents")
async def ingest_document(
    file: UploadFile = File(...),
    subject: str = "General",
    chapter: str = "General",
    topic: str = "General",
    exam: str = "General",
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_dir = Path(tempfile.mkdtemp())
    pdf_path = temp_dir / file.filename

    try:
        with pdf_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = pipeline.ingest_pdf(
            pdf_path=str(pdf_path),
            source=file.filename,
            subject=subject,
            chapter=chapter,
            topic=topic,
            exam=exam,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/rag/query", response_model=QueryResponse)
def rag_query(request: QueryRequest):
    try:
        return pipeline.query(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/mistakes/analyze", response_model=MistakeAnalysisResponse)
def analyze_mistake(request: MistakeAnalysisRequest):
    try:
        return mistake_analyzer.analyze(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
