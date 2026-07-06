import asyncio
import sys

# Override database URL to in-memory SQLite before importing main app components
from config import settings
settings.database_url = "sqlite+aiosqlite:///:memory:"

from fastapi.testclient import TestClient
from main import app, get_vector_service, get_llm_service, get_search_service
from interfaces import IVectorStoreService, ILLMService, ISearchService
from database import get_db
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base
from typing import List, Tuple
from langchain_core.documents import Document

# Setup an in-memory SQLite engine for testing database queries
engine = create_async_engine(settings.database_url, future=True, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Setup schemas in-memory
async def init_test_db():
    print("[1/9] Initializing in-memory SQLite database tables...", flush=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[2/9] Database tables created successfully.", flush=True)

# Database session dependency override
async def override_get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# Mock services to avoid external network/API dependencies
class MockVectorService(IVectorStoreService):
    def __init__(self):
        self.indices = {}

    async def create_index(self, chat_id: str, chunks: List[str]) -> None:
        self.indices[chat_id] = chunks

    async def similarity_search(self, chat_id: str, query: str, k: int = 3) -> List[Tuple[Document, float]]:
        return [(Document(page_content="Mock PDF content matching the query."), 1.0)]

    async def delete_index(self, chat_id: str) -> None:
        if chat_id in self.indices:
            del self.indices[chat_id]

class MockLLMService(ILLMService):
    async def generate_response(self, context: str, question: str, history: str, chat_id: str) -> dict:
        return {
            "answer": f"Mock response. Context was: {context}",
            "token_count": 42
        }

class MockSearchService(ISearchService):
    async def web_search(self, query: str) -> str:
        return "Mock web search content."

# Apply Dependency overrides
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_vector_service] = lambda: MockVectorService()
app.dependency_overrides[get_llm_service] = lambda: MockLLMService()
app.dependency_overrides[get_search_service] = lambda: MockSearchService()

# Mock PDF text extraction function inside main.py to prevent pypdf parsing crashes on dummy uploads
async def mock_extract_pdf_text(files):
    return "Mock PDF text content extracted from file."

import main
main.extract_pdf_text = mock_extract_pdf_text

def test_workflow():
    # Setup test DB tables
    asyncio.run(init_test_db())

    print("[3/9] Creating TestClient...", flush=True)
    client = TestClient(app)

    # 1. Test POST /upload
    print("[4/9] Testing POST /upload endpoint...", flush=True)
    files = [("files", ("test.pdf", b"%PDF-1.4...", "application/pdf"))]
    response = client.post("/upload", files=files)
    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    assert "chat_id" in data
    assert data["title"] == "test"
    chat_id = data["chat_id"]
    print(f"      Upload successful. Created chat_id: {chat_id}", flush=True)

    # 2. Test GET /chats
    print("[5/9] Testing GET /chats endpoint...", flush=True)
    response = client.get("/chats")
    assert response.status_code == 200
    chats_data = response.json()
    assert len(chats_data["chats"]) > 0
    assert any(c["chat_id"] == chat_id for c in chats_data["chats"])
    print("      Chats list retrieval verified.", flush=True)

    # 3. Test POST /chat
    print("[6/9] Testing POST /chat endpoint (RAG query)...", flush=True)
    response = client.post("/chat", json={"chat_id": chat_id, "question": "What is in the PDF?"})
    assert response.status_code == 200, f"Chat failed: {response.text}"
    chat_resp = response.json()
    assert "answer" in chat_resp
    assert "Mock response. Context was" in chat_resp["answer"]
    assert "sources" in chat_resp
    assert "pdf" in chat_resp["sources"]
    print("      Chat query execution verified.", flush=True)

    # 4. Test POST /messages
    print("[7/9] Testing POST /messages endpoint (chat history)...", flush=True)
    response = client.post("/messages", json={"chat_id": chat_id})
    assert response.status_code == 200
    msg_data = response.json()
    assert len(msg_data["messages"]) == 2  # User message and assistant message
    assert msg_data["messages"][0]["role"] == "user"
    assert msg_data["messages"][1]["role"] == "assistant"
    print("      Message history verification successful.", flush=True)

    # 5. Test DELETE /delete
    print("[8/9] Testing DELETE /delete endpoint...", flush=True)
    response = client.request("DELETE", "/delete", json={"chat_id": chat_id})
    assert response.status_code == 200
    assert response.json() == {"success": True}
    print("      Chat session deletion verified.", flush=True)

    # 6. Verify chats list is empty
    print("[9/9] Verifying chat cleanup list...", flush=True)
    response = client.get("/chats")
    assert response.status_code == 200
    assert not any(c["chat_id"] == chat_id for c in response.json()["chats"])
    print("      Cleanup confirmed.", flush=True)

if __name__ == "__main__":
    test_workflow()
    print("ALL TESTS PASSED SUCCESSFULLY!", flush=True)
    sys.exit(0)
