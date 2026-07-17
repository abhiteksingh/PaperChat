from langgraph.graph import StateGraph, START, END
import os
import math
import logging
from typing import TypedDict, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import init_db, get_db
from repositories.chat_repository import SQLAlchemyChatRepository
from services.vector_service import PineconeVectorService
from services.llm_service import GroqLLMService
from schemas import Request_Delete, Request_Format, Request_Messages
from rag import extract_file_text, split_parent_child_by_page, extract_topic_header
from services.search_utils import SimpleBM25, reciprocal_rank_fusion
from langchain_core.documents import Document
import json

# Import specialized chatbot personas agent logic
from agents.contract_auditor_agent import run_auditor_chat
from agents.spaced_learning_agent import run_notepad_chat
from agents.spreadsheet_analytics_agent import run_sandbox_chat
from agents.interview_simulator_agent import run_detective_chat

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

def get_vector_service() -> PineconeVectorService:
    global _vector_service
    if _vector_service is None:
        _vector_service = PineconeVectorService()
    return _vector_service

def get_llm_service() -> GroqLLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = GroqLLMService()
    return _llm_service

def get_chat_repo(db: AsyncSession = Depends(get_db)) -> SQLAlchemyChatRepository:
    return SQLAlchemyChatRepository(db)

# Decoupled LangGraph State Definition
class State(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: GroqLLMService
    chat_repo: SQLAlchemyChatRepository
    workspace_type: Optional[str]

# LangGraph Node Definition using dependency injection from State
async def chat_node(state: State):
    chat_repo = state["chat_repo"]
    llm_service = state["llm_service"]
    workspace_type = state.get("workspace_type", "chat")
    
    # Asynchronously load message history
    history = await chat_repo.load_messages(state["chat_id"])
    history_text = "\n".join(
         f"{msg['role']} : {msg['content']}"
         for msg in history[-10:]
    )

    # Route dynamically to selected persona agents
    if workspace_type == "audit":
        res = await run_auditor_chat(state, history_text)
    elif workspace_type == "study":
        res = await run_notepad_chat(state, history_text)
    elif workspace_type == "insight":
        res = await run_sandbox_chat(state, history_text)
    elif workspace_type == "career":
        res = await run_detective_chat(state, history_text)
    else:
        response_data = await llm_service.generate_response(
            context=state["context"],
            question=state["question"],
            history=history_text,
            chat_id=state["chat_id"]
        )
        res = {
            "answer": response_data["answer"],
            "token_count": response_data["token_count"]
        }

    return {
        "answer": res["answer"],
        "token_count": res["token_count"]
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
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo),
    vector_service: PineconeVectorService = Depends(get_vector_service),
    llm_service: GroqLLMService = Depends(get_llm_service)
):
    # Verify chat session exists
    chat = await chat_repo.get_chat(req.chat_id)
    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Document vector index not found or has been deleted. Please upload the PDF again."
        )

    # Check background parsing status
    if chat.get("status") == "processing":
        return {
            "answer": "I am still reading and indexing your document. Please wait a moment.",
            "sources": [],
            "token_count": 0,
            "citations": []
        }
    elif chat.get("status") == "failed":
        return {
            "answer": "Failed to extract text from the document. Please delete this chat and upload a valid PDF.",
            "sources": [],
            "token_count": 0,
            "citations": []
        }

    # Load parent-child chunks mapping
    chunks_json = chat.get("chunks_json")
    if chunks_json:
        chunks = json.loads(chunks_json)
    else:
        # Fallback for older legacy uploads
        raw_text = chat.get("raw_text") or ""
        pages_data = [{"page": 1, "text": raw_text}]
        chunks = split_parent_child_by_page(pages_data)

    # Execute hybrid search (Dense Pinecone + Hand-written Sparse BM25 + Reciprocal Rank Fusion)
    filter_dict = {"page": int(req.page)} if req.page is not None else None

    try:
        # 1. Fetch top 5 dense semantic results from Pinecone (returns parent chunks annotated with page numbers)
        dense_docs = await vector_service.similarity_search(req.chat_id, req.question, k=5, filter=filter_dict)
    except Exception as e:
        logger.error(f"Vector search similarity query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving context from document database."
        )

    # 2. Run local BM25 sparse search on cached child chunks
    if chunks:
        # Filter sparse chunks if page context is specified
        filtered_chunks = [c for c in chunks if c["page"] == req.page] if req.page is not None else chunks
        child_texts = [c["child"] for c in filtered_chunks]
        if child_texts:
            bm25 = SimpleBM25(child_texts)
            sparse_child_results = bm25.search(req.question, k=5)
            
            # Map sparse child chunk hits back to parent chunks
            sparse_results = []
            for child_text, score in sparse_child_results:
                match = next((c for c in filtered_chunks if c["child"] == child_text), None)
                if match:
                    sparse_results.append((match["parent"], score))
        else:
            sparse_results = []
    else:
        sparse_results = []

    # 3. Fuse rankings using Reciprocal Rank Fusion (RRF)
    dense_results = [(doc.page_content, score) for doc, score in dense_docs]
    fused_texts = reciprocal_rank_fusion(dense_results, sparse_results, rrf_k=60, top_k=3)

    # 4. Construct Citations and Format prompt context with page identifiers
    citations = []
    formatted_context_blocks = []
    
    for text in fused_texts:
        page_num = 1
        # Try to find page number in dense results first
        dense_match = next((doc for doc, _ in dense_docs if doc.page_content == text), None)
        if dense_match:
            page_num = dense_match.metadata.get("page", 1)
        else:
            # Fallback to SQL chunks mapping
            sparse_match = next((c for c in chunks if c["parent"] == text), None)
            if sparse_match:
                page_num = sparse_match.get("page", 1)
                
        citations.append({
            "page": page_num,
            "header": extract_topic_header(text),
            "text": text
        })
        formatted_context_blocks.append(f"[Source: Page {page_num}]\n{text}")

    context = "\n\n".join(formatted_context_blocks)
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
            "chat_repo": chat_repo,
            "workspace_type": req.workspace_type or "chat"
        })
    except Exception as e:
        logger.error(f"LangGraph execution failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate AI response."
        )

    # Save Assistant response with serialised citations in DB
    await chat_repo.save_message(
        req.chat_id,
        "assistant",
        response["answer"],
        response["token_count"],
        citations_json=json.dumps(citations)
    )

    return {
        "answer": response["answer"],
        "sources": ["pdf"],
        "token_count": response["token_count"],
        "citations": citations
    }


async def bg_process_pdf(
    chat_id: str,
    file_payloads: list[tuple[str, bytes]],
    chat_repo: SQLAlchemyChatRepository,
    vector_service: PineconeVectorService
):
    logger.info(f"Background PDF processing started for chat {chat_id}...")
    
    # Mock class that implements .read() as expected by extract_pdf_text
    class MockUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self.content = content
        async def read(self) -> bytes:
            return self.content

    mock_files = [MockUploadFile(name, content) for name, content in file_payloads]

    try:
        pages_data = await extract_file_text(mock_files)
        if not pages_data:
            logger.warning(f"Background processing: No extractable text in files for chat {chat_id}.")
            await chat_repo.update_chat_status(chat_id, "failed")
            return

        # Concatenate pages to create full text string for backward compatibility raw_text field
        full_text = "\n".join([page["text"] for page in pages_data])
        await chat_repo.update_chat_raw_text(chat_id, full_text)

        # Generate parent-child chunks page-by-page
        chunks = split_parent_child_by_page(pages_data)
        
        # Save chunks in database for BM25
        await chat_repo.update_chat_chunks(chat_id, json.dumps(chunks))

        # Upload child embeddings with parent/page metadata to Pinecone
        await vector_service.create_index(chat_id, chunks)
        
        # Mark as completed
        await chat_repo.update_chat_status(chat_id, "completed")
        logger.info(f"Background PDF processing completed successfully for chat {chat_id}.")
    except Exception as e:
        logger.error(f"Failed background processing for chat {chat_id}: {e}")
        await chat_repo.update_chat_status(chat_id, "failed")


@app.post("/upload")
async def upload_chat(
    background_tasks: BackgroundTasks,
    workspace_type: str = "chat",
    files: list[UploadFile] = File(...),
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo),
    vector_service: PineconeVectorService = Depends(get_vector_service)
):
    valid_extensions = ('.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.csv', '.txt', '.md')
    for file in files:
        if not file.filename.lower().endswith(valid_extensions):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file.filename}. Supported formats are PDF, Word, PowerPoint, Excel, CSV, Text, and Markdown."
            )

    # Read files in memory before response returns (as FastAPI cleans/closes UploadFiles on request end)
    file_payloads = []
    for file in files:
        content = await file.read()
        file_payloads.append((file.filename, content))

    # Create chat session record instantly in "processing" state
    title = os.path.splitext(files[0].filename)[0]
    chat_id = await chat_repo.create_chat(title, workspace_type=workspace_type)

    # Enqueue background PDF parsing and Pinecone vector upload
    background_tasks.add_task(
        bg_process_pdf,
        chat_id=chat_id,
        file_payloads=file_payloads,
        chat_repo=chat_repo,
        vector_service=vector_service
    )

    return {
        "chat_id": chat_id,
        "title": title,
        "status": "processing"
    }


@app.post("/messages")
async def get_messages(
    req: Request_Messages,
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo)
):
    messages = await chat_repo.load_messages(req.chat_id)
    return {
         "messages": messages
    }


@app.get("/chats/{chat_id}/concept-tree")
async def get_chat_concept_tree(
    chat_id: str,
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo)
):
    chat = await chat_repo.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    chunks_json = chat.get("chunks_json")
    if not chunks_json:
        return {"nodes": [], "edges": []}
    
    try:
        chunks = json.loads(chunks_json)
    except Exception:
        return {"nodes": [], "edges": []}
    
    # Group parent chunks by page number to create dynamic tree nodes
    page_nodes_dict = {}
    for chunk in chunks:
        page = chunk.get("page", 1)
        parent_text = chunk.get("parent", "")
        if page not in page_nodes_dict and parent_text.strip():
            page_nodes_dict[page] = parent_text
            
    # Formulate nodes list
    nodes = []
    sorted_pages = sorted(list(page_nodes_dict.keys()))
    for idx, page in enumerate(sorted_pages):
        parent_text = page_nodes_dict[page]
        label = extract_topic_header(parent_text)
        
        # Take a snippet of the text for the popover metadata view
        text_snippet = parent_text[:200] + "..." if len(parent_text) > 200 else parent_text
        
        nodes.append({
            "id": idx,
            "label": label,
            "page": page,
            "text": text_snippet
        })
        
    # Formulate edges list (connect sequential pages)
    edges = []
    for i in range(len(nodes) - 1):
        edges.append({"source": i, "target": i + 1})
        # Add additional cross-linkage to make it look like a tree map
        if i + 2 < len(nodes):
            edges.append({"source": i, "target": i + 2})
            
    return {"nodes": nodes, "edges": edges}


@app.get("/chats")
async def get_chats(
    workspace_type: Optional[str] = None,
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo)
):
    chats = await chat_repo.load_chats(workspace_type=workspace_type)
    return {
         "chats": chats
    }


@app.delete("/delete")
async def chat_delete(
    req: Request_Delete,
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo),
    vector_service: PineconeVectorService = Depends(get_vector_service)
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