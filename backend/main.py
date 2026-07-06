from langgraph.graph import StateGraph, START, END
import os
import math
import logging
from typing import TypedDict, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import init_db, get_db
from interfaces import IChatRepository, IVectorStoreService, ILLMService, ISearchService
from repositories.chat_repository import SQLAlchemyChatRepository
from services.vector_service import PineconeVectorService
from services.llm_service import GroqLLMService
from services.search_service import DDGSearchService
from schemas import Request_Delete, Request_Format, Request_Messages
from rag import extract_pdf_text, split_text

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Lifespan context manager for database initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing system components and database tables...")
    await init_db()
    yield
    logger.info("Shutting down backend services...")

app = FastAPI(lifespan=lifespan)

# Setup CORS using origins from configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate singleton services lazily to avoid import-time side effects
_vector_service = None
_llm_service = None
_search_service = None

def get_vector_service() -> IVectorStoreService:
    global _vector_service
    if _vector_service is None:
        _vector_service = PineconeVectorService()
    return _vector_service

def get_llm_service() -> ILLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = GroqLLMService()
    return _llm_service

def get_search_service() -> ISearchService:
    global _search_service
    if _search_service is None:
        _search_service = DDGSearchService()
    return _search_service

def get_chat_repo(db: AsyncSession = Depends(get_db)) -> IChatRepository:
    return SQLAlchemyChatRepository(db)

# Decoupled LangGraph State Definition
class State(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: ILLMService
    chat_repo: IChatRepository

# LangGraph Node Definition using dependency injection from State
async def chat_node(state: State):
    chat_repo = state["chat_repo"]
    llm_service = state["llm_service"]
    
    # Asynchronously load message history
    history = await chat_repo.load_messages(state["chat_id"])
    history_text = "\n".join(
         f"{msg['role']} : {msg['content']}"
         for msg in history[-10:]
    )

    # Asynchronously query LLM
    response_data = await llm_service.generate_response(
        context=state["context"],
        question=state["question"],
        history=history_text,
        chat_id=state["chat_id"]
    )

    return {
        "answer": response_data["answer"],
        "token_count": response_data["token_count"]
    }

# Assemble StateGraph
chat_graph = StateGraph(State)
chat_graph.add_node("chat", chat_node)
chat_graph.add_edge(START, "chat")
chat_graph.add_edge("chat", END)
chat_workflow = chat_graph.compile()


@app.post("/chat")
async def pdf_chat(
    req: Request_Format,
    chat_repo: IChatRepository = Depends(get_chat_repo),
    vector_service: IVectorStoreService = Depends(get_vector_service),
    llm_service: ILLMService = Depends(get_llm_service),
    search_service: ISearchService = Depends(get_search_service)
):
    # Verify chat session exists
    chat = await chat_repo.get_chat(req.chat_id)
    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Document vector index not found or has been deleted. Please upload the PDF again."
        )

    # Execute similarity search inside Pinecone
    try:
        docs = await vector_service.similarity_search(req.chat_id, req.question)
    except Exception as e:
        logger.error(f"Vector search similarity query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving context from document database."
        )

    # Calculate fallback triggers
    if not docs:
        distance = 999.0
        pdf_context = ""
    else:
        best_doc, similarity = docs[0]
        # Convert cosine similarity to L2 distance to maintain L2-based threshold compatibility
        # L2 = sqrt(2 - 2 * cos_sim)
        similarity = max(-1.0, min(1.0, similarity))
        distance = math.sqrt(2.0 - 2.0 * similarity)
        pdf_context = "\n\n".join(doc.page_content for doc, _ in docs)

    context = pdf_context
    sources = ["pdf"]

    # Fallback to web search if similarity is low
    if distance > settings.l2_distance_threshold:
        logger.info(f"Low document similarity (L2={distance:.2f} > {settings.l2_distance_threshold}). Activating DuckDuckGo fallback...")
        web_context = await search_service.web_search(req.question)
        if web_context:
            context += "\n\nWeb Information:\n" + web_context
            sources.append("web")

    question = req.question.strip()

    # Save User message in DB
    await chat_repo.save_message(req.chat_id, "user", req.question, None)

    # Execute decoupled LangGraph workflow
    try:
        response = await chat_workflow.ainvoke({
            "context": context,
            "question": question,
            "chat_id": req.chat_id,
            "llm_service": llm_service,
            "chat_repo": chat_repo
        })
    except Exception as e:
        logger.error(f"LangGraph execution failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate AI response."
        )

    # Save Assistant response in DB
    await chat_repo.save_message(
        req.chat_id,
        "assistant",
        response["answer"],
        response["token_count"]
    )

    return {
        "answer": response["answer"],
        "sources": sources,
        "token_count": response["token_count"]
    }


@app.post("/upload")
async def upload_chat(
    files: list[UploadFile] = File(...),
    chat_repo: IChatRepository = Depends(get_chat_repo),
    vector_service: IVectorStoreService = Depends(get_vector_service)
):
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file.filename}. Only PDF files are supported."
            )

    try:
        text = await extract_pdf_text(files)
    except Exception as e:
        logger.error(f"Failed to extract text from uploaded PDF files: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error reading PDF file content."
        )

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF does not contain extractable text. Please ensure it is not a scanned image PDF."
        )

    chunks = split_text(text)

    # Create chat session metadata record
    title = os.path.splitext(files[0].filename)[0]
    chat_id = await chat_repo.create_chat(title)

    # Embed and upload chunks to Pinecone vector database
    try:
        await vector_service.create_index(chat_id, chunks)
    except Exception as e:
        logger.error(f"Failed to generate embeddings and load Pinecone vectors: {e}")
        # Rollback chat session creation on vector store failure
        await chat_repo.delete_chat(chat_id)
        raise HTTPException(
            status_code=500,
            detail="Error indexing document embeddings."
        )

    return {
        "chat_id": chat_id,
        "title": title
    }


@app.post("/messages")
async def get_messages(
    req: Request_Messages,
    chat_repo: IChatRepository = Depends(get_chat_repo)
):
    messages = await chat_repo.load_messages(req.chat_id)
    return {
         "messages": messages
    }


@app.get("/chats")
async def get_chats(
    chat_repo: IChatRepository = Depends(get_chat_repo)
):
    chats = await chat_repo.load_chats()
    return {
         "chats": chats
    }


@app.delete("/delete")
async def chat_delete(
    req: Request_Delete,
    chat_repo: IChatRepository = Depends(get_chat_repo),
    vector_service: IVectorStoreService = Depends(get_vector_service)
):
    # Verify chat exists before delete operations
    chat = await chat_repo.get_chat(req.chat_id)
    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found."
        )

    # Delete index inside Pinecone
    try:
        await vector_service.delete_index(req.chat_id)
    except Exception as e:
        logger.error(f"Error purging Pinecone vectors for chat session {req.chat_id}: {e}")

    # Delete DB records
    await chat_repo.delete_chat(req.chat_id)

    return {
         "success": True
    }