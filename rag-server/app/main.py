from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router, rag_pipeline

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI RAG Microservice utilizing ChromaDB and Gemini API for Study Insights."
)

# CORS: allow only the Node backend origin.
# Service-to-service calls do not originate from a browser, so CORS does not
# protect them (the x-service-token header does). However, restricting origins
# still prevents browsers from directly hitting the RAG service.
# BACKEND_ORIGIN is set via Render environment; falls back to empty list (deny all browser origins).
import os
_backend_origin = os.getenv("BACKEND_ORIGIN", "").strip()
_allowed_origins = [_backend_origin] if _backend_origin else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "x-service-token"],
)

# Health endpoint
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "model": settings.GEMINI_MODEL,
        "gemini_key_configured": bool(settings.GEMINI_API_KEY),
        "vector_store": "ChromaDB",
    }

# Register RAG routes
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
