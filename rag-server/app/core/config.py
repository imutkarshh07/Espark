import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        PROJECT_NAME: str = "Study Insights RAG Microservice"
        VERSION: str = "1.0.0"
        ENVIRONMENT: str = "development"
        PORT: int = 8000
        HOST: str = "0.0.0.0"

        # Gemini API
        GEMINI_API_KEY: str = ""
        GEMINI_MODEL: str = "gemini-3.8-flash"

        # Supabase
        SUPABASE_URL: str = ""
        SUPABASE_SERVICE_ROLE_KEY: str = ""

        # Vector Storage
        CHROMA_PATH: str = "./data/chroma"
        COLLECTION_NAME: str = "study_insights_documents"

        # Embedding Model
        EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )

    settings = Settings()

except ImportError:
    class FallbackSettings:
        PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Study Insights RAG Microservice")
        VERSION: str = "1.0.0"
        ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        PORT: int = int(os.getenv("PORT", "8000"))
        HOST: str = os.getenv("HOST", "0.0.0.0")

        # Gemini API
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        # Supabase
        SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
        SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

        # Vector Storage
        CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./data/chroma")
        COLLECTION_NAME: str = os.getenv("COLLECTION_NAME", "study_insights_documents")

        # Embedding Model
        EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

    settings = FallbackSettings()
