from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from dotenv import load_dotenv
import os

# Dynamically locate and load the .env file
if os.path.exists("backend/.env"):
    load_dotenv("backend/.env")
elif os.path.exists(".env"):
    load_dotenv(".env")
else:
    load_dotenv()

class Settings(BaseSettings):
    groq_api_key: str
    pinecone_api_key: str
    pinecone_index_name: str = "pdf-chatbot"
    # LOCAL DEV DEFAULT: Defaults to SQLite.
    # IN PRODUCTION: Set the DATABASE_URL environment variable to your PostgreSQL connection string.
    # Pydantic Settings will automatically detect and override this value.
    # To remove SQLite fallback completely later, just hardcode the postgres URL here:
    database_url: str = "sqlite+aiosqlite:///./chat.db"
    llm_model: str = "llama-3.3-70b-versatile"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    parent_chunk_size: int = 1200
    parent_chunk_overlap: int = 200
    child_chunk_size: int = 300
    child_chunk_overlap: int = 50
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

settings = Settings()
