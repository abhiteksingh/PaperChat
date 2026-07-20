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
from rag import extract_file_text, split_parent_child_by_page, extract_topic_header, detect_missing_clauses_hybrid, check_ats_structure, classify_seniority_tier, analyze_spreadsheet_data
from services.search_utils import SimpleBM25, reciprocal_rank_fusion
from langchain_core.documents import Document
import json

# Import specialized chatbot personas agent logic
from agents.contract_auditor_agent import run_auditor_chat
from agents.spaced_learning_agent import run_notepad_chat
from agents.spreadsheet_analytics_agent import run_sandbox_chat
from agents.interview_simulator_agent import run_detective_chat
from agents.general_chat_agent import run_general_chat

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
        res = await run_general_chat(state, history_text)

    response_payload = {
        "answer": res["answer"],
        "token_count": res["token_count"]
    }
    if "suggestions" in res:
        response_payload["suggestions"] = res["suggestions"]
    return response_payload

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

    # Handle /set_exam_date command — persist exam date without calling LLM or saving chat messages
    if req.question.startswith("/set_exam_date "):
        date_val = req.question[len("/set_exam_date "):].strip()
        if chat.get("workspace_type") == "spaced-learning":
            try:
                existing_results_json = chat.get("analysis_results_json")
                existing_results = json.loads(existing_results_json) if existing_results_json else {}
                existing_results["exam_date"] = date_val
                await chat_repo.update_chat_analysis_results(req.chat_id, json.dumps(existing_results))
            except Exception as e:
                logger.error(f"Failed to persist exam date: {e}")
        return {"answer": "", "sources": [], "token_count": 0, "citations": [], "suggestions": []}

    # Handle /review command — update flashcard rating and heatmap color early to bypass LangGraph workflow
    if req.question.startswith("/review "):
        try:
            import math
            cmd_str = req.question[len("/review "):].strip()
            cmd_data = json.loads(cmd_str)
            card_id = cmd_data.get("id")
            grade = cmd_data.get("grade")
            
            existing_results_json = chat.get("analysis_results_json")
            existing_results = json.loads(existing_results_json) if existing_results_json else {}
            
            flashcards = existing_results.get("flashcards", [])
            exam_date_str = existing_results.get("exam_date")
            
            for card in flashcards:
                if card.get("id") == card_id:
                    card["grade"] = grade
                    half_life = card.get("half_life", 1)
                    if grade == "Again":
                        half_life = 1
                        card["interval"] = "Due in 1 day"
                    elif grade == "Good":
                        half_life = half_life * 2
                        card["interval"] = f"Due in {half_life} days"
                    elif grade == "Easy":
                        half_life = half_life * 3
                        card["interval"] = f"Due in {half_life} days"
                    card["half_life"] = half_life
                    
                    # Predict forgetting risk at exam date
                    if exam_date_str:
                        from datetime import datetime
                        try:
                            exam_dt = datetime.strptime(exam_date_str, "%Y-%m-%d")
                            delta_days = (exam_dt - datetime.now()).days
                            delta_days = max(1, delta_days)
                            retrievability = math.exp(-delta_days / half_life)
                            card["forgotten_risk"] = retrievability < 0.70
                        except Exception:
                            card["forgotten_risk"] = False
                    break
            
            existing_results["flashcards"] = flashcards
            
            # Update matching entry in heatmap to change concept node color dynamically in the graph
            heatmap = existing_results.get("heatmap", [])
            card_topic = next((card.get("topic") for card in flashcards if card.get("id") == card_id), None)
            if card_topic:
                grade_map = {
                    "Again": ("LOW", "#FF4C4C", 0.35),
                    "Good": ("MEDIUM", "#FFC107", 0.70),
                    "Easy": ("HIGH", "#3ECF8E", 0.85)
                }
                if grade in grade_map:
                    lvl, col, perf = grade_map[grade]
                    updated = False
                    for h in heatmap:
                        if h.get("name").lower() == card_topic.lower():
                            h["level"] = lvl
                            h["color"] = col
                            h["measured_performance"] = perf
                            updated = True
                            break
                    if not updated:
                        heatmap.append({
                            "name": card_topic,
                            "level": lvl,
                            "color": col,
                            "measured_performance": perf
                        })
            
            existing_results["heatmap"] = heatmap
            await chat_repo.update_chat_analysis_results(req.chat_id, json.dumps(existing_results))
            
            return {
                "answer": "",
                "sources": [],
                "token_count": 0,
                "citations": [],
                "flashcards": flashcards,
                "heatmap": heatmap,
                "elaborative_prompts": existing_results.get("elaborative_prompts", [])
            }
        except Exception as review_err:
            logger.error(f"Failed to process flashcard review early: {review_err}")
            raise HTTPException(status_code=500, detail="Failed to process flashcard review.")

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
        # Filter dense docs by similarity score threshold to discard generic conversational queries
        dense_docs = [(doc, score) for doc, score in dense_docs if score >= 0.45]
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
            # Filter out search hits with zero matching relevance score
            sparse_child_results = [(doc, score) for doc, score in sparse_child_results if score > 0.0]
            
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
        filename = ""
        # Try to find page number and filename in dense results first
        dense_match = next((doc for doc, _ in dense_docs if doc.page_content == text), None)
        if dense_match:
            page_num = dense_match.metadata.get("page", 1)
            filename = dense_match.metadata.get("filename", "")
        else:
            # Fallback to SQL chunks mapping
            sparse_match = next((c for c in chunks if c["parent"] == text), None)
            if sparse_match:
                page_num = sparse_match.get("page", 1)
                filename = sparse_match.get("filename", "")
                
        try:
            page_num = int(float(page_num))
        except (ValueError, TypeError):
            page_num = 1
            
        citations.append({
            "page": page_num,
            "filename": filename,
            "header": extract_topic_header(text),
            "text": text
        })
        source_label = f"[Source: {filename}, Page {page_num}]" if filename else f"[Source: Page {page_num}]"
        formatted_context_blocks.append(f"{source_label}\n{text}")

    context = "\n\n".join(formatted_context_blocks)
    question = req.question.strip()

    # Save User message in DB (skip for silent internal calls like quiz generation or flashcard grading)
    if not req.silent:
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

    answer = response["answer"]
    json_data = {}
    import re
    match = re.search(r"<json_payload>(.*?)</json_payload>", answer, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
        try:
            json_data = json.loads(json_str)
        except Exception as parse_err:
            logger.error(f"Failed to parse JSON payload: {parse_err}. String was: {json_str}")
        # Strip the tags and payload from the visible answer
        answer = answer[:match.start()] + answer[match.end():]
        answer = answer.strip()

    # Save Assistant response with serialised citations in DB (skip for silent internal calls)
    if not req.silent:
        await chat_repo.save_message(
            req.chat_id,
            "assistant",
            answer,
            response["token_count"],
            citations_json=json.dumps(citations)
        )

    # Save the latest analysis metrics in the chats table for persistence
    workspace_type = chat.get("workspace_type") if chat else "chat"
    
    if isinstance(json_data, dict):
        try:
            existing_results_json = chat.get("analysis_results_json")
            existing_results = json.loads(existing_results_json) if existing_results_json else {}
            
            if workspace_type == "contract-auditor":
                for key in ["compliance_score", "vulnerabilities", "obligations", "conflicts", "radar_scores"]:
                    if key in json_data:
                        existing_results[key] = json_data[key]
                await chat_repo.update_chat_analysis_results(req.chat_id, json.dumps(existing_results))
                
            elif workspace_type == "interview-simulator":
                # Compute filler word hedging ratio from candidate answer
                text_lower = req.question.lower()
                fillers = ["i think", "kind of", "just", "sort of", "like", "actually", "basically", "literally", "perhaps"]
                hedge_count = sum(text_lower.count(filler) for filler in fillers)
                confidence_ratio = max(0, 100 - (hedge_count * 15))
                
                # Update scores history
                scores_history = existing_results.get("scores_history", [])
                if "scores" in json_data:
                    new_round = {
                        "round": len(scores_history) + 1,
                        "communication_clarity": json_data["scores"].get("communication_clarity", 80),
                        "technical_depth": json_data["scores"].get("technical_depth", 80),
                        "star_completeness": json_data["scores"].get("star_completeness", 80),
                        "confidence_ratio": confidence_ratio
                    }
                    scores_history.append(new_round)
                    existing_results["scores_history"] = scores_history
                    
                # Save latest CV analysis / gaps / feedback
                for key in ["cv_analysis", "star_feedback", "consistency_flags"]:
                    if key in json_data:
                        existing_results[key] = json_data[key]
                        
                await chat_repo.update_chat_analysis_results(req.chat_id, json.dumps(existing_results))
                
                # Pass compiled scores_history & ats_checklist to payload
                json_data["scores_history"] = scores_history
                if "ats_checklist" in existing_results:
                    json_data["ats_checklist"] = existing_results["ats_checklist"]
            elif workspace_type == "spaced-learning":
                # Handle exam date persistence
                if req.exam_date:
                    existing_results["exam_date"] = req.exam_date
                
                # Check for flashcard review command
                if req.question.startswith("/review "):
                    try:
                        import math
                        cmd_str = req.question[len("/review "):].strip()
                        cmd_data = json.loads(cmd_str)
                        card_id = cmd_data.get("id")
                        grade = cmd_data.get("grade")
                        
                        # Load and update flashcard in cached results
                        flashcards = existing_results.get("flashcards", [])
                        exam_date_str = existing_results.get("exam_date")
                        
                        for card in flashcards:
                            if card.get("id") == card_id:
                                card["grade"] = grade
                                half_life = card.get("half_life", 1)
                                if grade == "Again":
                                    half_life = 1
                                    card["interval"] = "Due in 1 day"
                                elif grade == "Good":
                                    half_life = half_life * 2
                                    card["interval"] = f"Due in {half_life} days"
                                elif grade == "Easy":
                                    half_life = half_life * 3
                                    card["interval"] = f"Due in {half_life} days"
                                card["half_life"] = half_life
                                
                                # Predict forgetting risk at exam date
                                if exam_date_str:
                                    from datetime import datetime
                                    try:
                                        exam_dt = datetime.strptime(exam_date_str, "%Y-%m-%d")
                                        delta_days = (exam_dt - datetime.now()).days
                                        delta_days = max(1, delta_days)
                                        retrievability = math.exp(-delta_days / half_life)
                                        card["forgotten_risk"] = retrievability < 0.70
                                    except Exception:
                                        card["forgotten_risk"] = False
                                break
                        existing_results["flashcards"] = flashcards
                    except Exception as review_err:
                        logger.error(f"Failed to process flashcard review: {review_err}")
                
                # Save latest heatmaps, flashcards, connecting questions returned by agent
                for key in ["flashcards", "heatmap", "elaborative_prompts"]:
                    if key in json_data:
                        # For new flashcards generated, initialize half-life
                        new_cards = json_data[key]
                        if key == "flashcards":
                            existing_cards = existing_results.get("flashcards", [])
                            # Merge or replace existing cards
                            card_map = {c["topic"]: c for c in existing_cards}
                            for card in new_cards:
                                topic = card["topic"]
                                if topic in card_map:
                                    # keep half_life & interval status
                                    card["half_life"] = card_map[topic].get("half_life", 1)
                                    card["interval"] = card_map[topic].get("interval", "New")
                                    card["grade"] = card_map[topic].get("grade", "New")
                                    card["forgotten_risk"] = card_map[topic].get("forgotten_risk", False)
                                else:
                                    card["half_life"] = 1
                                    card["forgotten_risk"] = False
                            existing_results["flashcards"] = new_cards
                        else:
                            existing_results[key] = new_cards
                            
                await chat_repo.update_chat_analysis_results(req.chat_id, json.dumps(existing_results))
                
                # Feed persistent state back in payload
                json_data["flashcards"] = existing_results.get("flashcards", [])
                json_data["heatmap"] = existing_results.get("heatmap", [])
                json_data["elaborative_prompts"] = existing_results.get("elaborative_prompts", [])
                if "exam_date" in existing_results:
                    json_data["exam_date"] = existing_results["exam_date"]
            elif workspace_type in ["insight", "spreadsheet-analytics"]:
                # Check for parameter tweak command
                if req.question.startswith("/tweak "):
                    try:
                        cmd_str = req.question[len("/tweak "):].strip()
                        cmd_data = json.loads(cmd_str)
                        var_name = cmd_data.get("name")
                        var_val = float(cmd_data.get("value"))
                        
                        variables = existing_results.get("variables", [])
                        for var in variables:
                            if var.get("name") == var_name:
                                var["value"] = var_val
                                break
                        existing_results["variables"] = variables
                        
                        # Add tweak to assumption log
                        from datetime import datetime
                        now_str = datetime.now().strftime("%H:%M")
                        assumption_log = existing_results.get("assumption_log", [])
                        assumption_log.insert(0, {"time": now_str, "event": f"Variable {var_name} set to {var_val:.2f}"})
                        existing_results["assumption_log"] = assumption_log[:10]
                    except Exception as tweak_err:
                        logger.error(f"Failed to process slider tweak: {tweak_err}")
                
                # Perform Sensitivity Analysis (Tornado)
                # Formula representation: outcome = sum(var["value"] * coefficient)
                # Let's dynamically associate a coefficient of (index + 1.5) to variables
                variables = existing_results.get("variables", [])
                tornado_chart = []
                base_outcome = 0
                for idx, var in enumerate(variables):
                    coeff = idx + 1.5
                    base_outcome += var.get("value", var.get("mean", 1)) * coeff
                    
                for idx, var in enumerate(variables):
                    coeff = idx + 1.5
                    current_val = var.get("value", var.get("mean", 1))
                    min_val = var.get("min", 0)
                    max_val = var.get("max", current_val * 2)
                    
                    # Swing outcome
                    outcome_min = base_outcome - (current_val * coeff) + (min_val * coeff)
                    outcome_max = base_outcome - (current_val * coeff) + (max_val * coeff)
                    tornado_chart.append({
                        "name": var.get("name"),
                        "min_outcome": float(outcome_min),
                        "max_outcome": float(outcome_max),
                        "swing": float(abs(outcome_max - outcome_min))
                    })
                # Sort descending by swing
                tornado_chart.sort(key=lambda x: x["swing"], reverse=True)
                existing_results["tornado_chart"] = tornado_chart
                existing_results["outcome_metric"] = float(base_outcome)
                
                # Check for Goal-Seek Reverse Solve
                if req.question.startswith("/goal_seek "):
                    try:
                        cmd_str = req.question[len("/goal_seek "):].strip()
                        cmd_data = json.loads(cmd_str)
                        target_var = cmd_data.get("variable")
                        target_outcome = float(cmd_data.get("target"))
                        
                        # Solve: base_outcome - (current_val * coeff) + (needed_val * coeff) = target_outcome
                        # needed_val = (target_outcome - base_outcome + current_val * coeff) / coeff
                        solved_val = None
                        for idx, var in enumerate(variables):
                            if var.get("name") == target_var:
                                coeff = idx + 1.5
                                current_val = var.get("value", var.get("mean", 1))
                                solved_val = (target_outcome - base_outcome + current_val * coeff) / coeff
                                break
                        if solved_val is not None:
                            answer = f"Goal Seek Successful! To reach target outcome of {target_outcome:,.2f}, variable '{target_var}' must be adjusted to **{solved_val:,.4f}** (currently: {current_val:,.2f})."
                    except Exception as gs_err:
                        logger.error(f"Failed goal seek solve: {gs_err}")
                        
                # Perform Monte Carlo simulation if requested (e.g. random samples of outcome)
                import random
                monte_carlo_distribution = []
                for _ in range(50):
                    sampled_outcome = 0
                    for idx, var in enumerate(variables):
                        coeff = idx + 1.5
                        mean_val = var.get("value", var.get("mean", 1))
                        # sample range +/- 20%
                        sampled_val = random.uniform(mean_val * 0.8, mean_val * 1.2)
                        sampled_outcome += sampled_val * coeff
                    monte_carlo_distribution.append(float(sampled_outcome))
                existing_results["monte_carlo_distribution"] = sorted(monte_carlo_distribution)
                
                await chat_repo.update_chat_analysis_results(req.chat_id, json.dumps(existing_results))
                
                # Pass compiled stats back to response payload
                json_data["variables"] = existing_results.get("variables", [])
                json_data["outliers"] = existing_results.get("outliers", [])
                json_data["forecast"] = existing_results.get("forecast", {})
                json_data["tornado_chart"] = existing_results.get("tornado_chart", [])
                json_data["outcome_metric"] = existing_results.get("outcome_metric", 0.0)
                json_data["monte_carlo_distribution"] = existing_results.get("monte_carlo_distribution", [])
                json_data["assumption_log"] = existing_results.get("assumption_log", [])
        except Exception as update_err:
            logger.error(f"Failed to update chat analysis results: {update_err}")

    res_payload = {
        "answer": answer,
        "sources": ["pdf"],
        "token_count": response["token_count"],
        "citations": citations,
        "suggestions": response.get("suggestions", [])
    }
    if isinstance(json_data, dict):
        res_payload.update(json_data)

    return res_payload


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

        # Select background analysis checks based on workspace_type
        chat = await chat_repo.get_chat(chat_id)
        workspace_type = chat.get("workspace_type") if chat else "chat"
        
        if workspace_type == "contract-auditor":
            try:
                missing_clauses = detect_missing_clauses_hybrid(chunks)
                analysis_results = {"missing_clauses": missing_clauses}
                await chat_repo.update_chat_analysis_results(chat_id, json.dumps(analysis_results))
                logger.info(f"Background missing clause scan finished. Missing: {missing_clauses}")
            except Exception as scan_err:
                logger.error(f"Failed missing clause scan: {scan_err}")
        elif workspace_type == "interview-simulator":
            try:
                ats_checklist = check_ats_structure(full_text)
                seniority_tier = classify_seniority_tier(full_text)
                analysis_results = {
                    "ats_checklist": ats_checklist,
                    "seniority_tier": seniority_tier,
                    "scores_history": []
                }
                await chat_repo.update_chat_analysis_results(chat_id, json.dumps(analysis_results))
                logger.info(f"Background career analysis finished. Seniority: {seniority_tier}, ATS score: {ats_checklist['score']}")
            except Exception as scan_err:
                logger.error(f"Failed career background analysis: {scan_err}")
        elif workspace_type in ["insight", "spreadsheet-analytics"]:
            try:
                sheet_metrics = analyze_spreadsheet_data(full_text)
                analysis_results = {
                    "variables": sheet_metrics["variables"],
                    "outliers": sheet_metrics["outliers"],
                    "forecast": sheet_metrics["forecast"],
                    "assumption_log": [{"time": "00:00", "event": "Dataset parsed successfully"}]
                }
                await chat_repo.update_chat_analysis_results(chat_id, json.dumps(analysis_results))
                logger.info(f"Background spreadsheet analysis finished. Outliers: {len(sheet_metrics['outliers'])}")
            except Exception as scan_err:
                logger.error(f"Failed spreadsheet background analysis: {scan_err}")
        elif workspace_type == "spaced-learning":
            try:
                from groq import AsyncGroq
                groq_client = AsyncGroq(api_key=settings.groq_api_key)
                
                # Build context snippet from document pages
                overview_text = ""
                unique_files = list(set([p.get("filename", "document") for p in pages_data]))
                for fname in unique_files[:2]:
                    file_pages = [p for p in pages_data if p.get("filename") == fname]
                    # Sample text from first few pages to understand the subject
                    for p in file_pages[:12]:
                        snippet = p["text"].strip()
                        if snippet:
                            overview_text += f"\n[File: {fname}, Page {p['page']}]\n{snippet[:400]}\n"
                
                prompt = f"""You are an expert academic study assistant. Analyze this textbook/lecture slides text overview:
{overview_text}

Perform two tasks:
1. Generate a beautifully structured Study Guide (notes) using markdown. Use proper `#` and `##` headings, bullet points, and brief, high-density explanations. Focus on the most important formulas, equations, or concepts (like D-H representation, forward kinematics, rotation matrices, etc.). Do not include raw date stamps or slide page headers in the text.
2. Select the top 10 most crucial distinct concepts/questions for active recall, and generate a structured list of flashcards & practice problems.

Return the results strictly as a clean JSON object (do not write any introductory or concluding text, only the JSON block) with the following structure:
{{
    "notes": "# Study Notes Header\\n\\n## Section name\\n- Concept description...",
    "flashcards": [
        {{
            "id": 101,
            "topic": "Concept Name",
            "type": "FLASHCARD",
            "question": "What is the physical meaning of the d parameter in D-H representation?",
            "answer": "The d parameter represents the joint offset along the previous z-axis to the common normal.",
            "interval": "New",
            "grade": "New",
            "half_life": 1,
            "forgotten_risk": false,
            "chapter": "Unit: Kinematics"
        }}
    ],
    "heatmap": [
        {{
            "name": "Concept Name",
            "level": "LOW",
            "color": "#FF4C4C",
            "measured_performance": 0.35
        }}
    ],
    "elaborative_prompts": [
        {{
            "question": "How does Concept A relate to Concept B?",
            "connects_to": "Concept B"
        }}
    ]
}}"""
                
                raw_res = await groq_client.chat.completions.create(
                    model=settings.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                res_text = raw_res.choices[0].message.content.strip()
                if res_text.startswith("```json"):
                    res_text = res_text[7:]
                if res_text.endswith("```"):
                    res_text = res_text[:-3]
                res_text = res_text.strip()
                
                analysis_results = json.loads(res_text)
                # Ensure all required keys exist
                if "notes" not in analysis_results:
                    analysis_results["notes"] = f"# Study Notes for {chat.get('title')}\n\nFailed to extract structured guide."
                if "flashcards" not in analysis_results:
                    analysis_results["flashcards"] = []
                if "heatmap" not in analysis_results:
                    analysis_results["heatmap"] = []
                if "elaborative_prompts" not in analysis_results:
                    analysis_results["elaborative_prompts"] = []
                
                await chat_repo.update_chat_analysis_results(chat_id, json.dumps(analysis_results))
                logger.info(f"Background study guide and flashcards generated successfully for chat {chat_id}.")
            except Exception as study_err:
                logger.error(f"Failed to generate background study data: {study_err}")
        elif workspace_type == "chat":
            try:
                from groq import AsyncGroq
                groq_client = AsyncGroq(api_key=settings.groq_api_key)
                
                overview_text = ""
                unique_files = list(set([p.get("filename", "document") for p in pages_data]))
                for fname in unique_files[:3]:
                    overview_text += f"\nFile: {fname}\n"
                    file_pages = [p for p in pages_data if p.get("filename") == fname]
                    for p in file_pages[:5]:
                        snippet = p["text"].strip().split('\n')[0][:80]
                        overview_text += f" - Page {p['page']}: {snippet}\n"
                        
                outline_prompt = f"""You are an assistant that creates structured outlines. Analyze the page starts of the uploaded document(s):
{overview_text}

Generate a concise, structured outline (3-5 items maximum per file) showing headings, sections, or key topics. Do not write introductory prose; start directly with the outline bullets."""
                
                raw_response = await groq_client.chat.completions.create(
                    model=settings.llm_model,
                    messages=[{"role": "user", "content": outline_prompt}],
                    temperature=0.3
                )
                outline_text = raw_response.choices[0].message.content.strip()
                
                # Extracted Entities prompt
                entity_prompt = f"""You are an assistant that extracts entities and key terms. Analyze this document text overview:
{overview_text}

Extract the following items from the document text:
1. Key dates mentioned and their significance.
2. Names of key organizations, systems, or people.
3. Key terminology or definitions (2-3 items).

Return the results strictly as a clean JSON object (do not write any introductory or concluding text, only the JSON block) with the following structure:
{{
    "dates": ["Date - Significance"],
    "names": ["Name - Description"],
    "definitions": ["Term - Definition"]
}}"""
                
                raw_entity_res = await groq_client.chat.completions.create(
                    model=settings.llm_model,
                    messages=[{"role": "user", "content": entity_prompt}],
                    temperature=0.2
                )
                entity_text = raw_entity_res.choices[0].message.content.strip()
                
                if entity_text.startswith("```json"):
                    entity_text = entity_text[7:]
                if entity_text.endswith("```"):
                    entity_text = entity_text[:-3]
                entity_text = entity_text.strip()
                
                try:
                    entities = json.loads(entity_text)
                except Exception:
                    entities = {"dates": [], "names": [], "definitions": []}
                
                analysis_results = {
                    "document_outline": outline_text,
                    "extracted_entities": entities
                }
                await chat_repo.update_chat_analysis_results(chat_id, json.dumps(analysis_results))
                logger.info(f"Background outline and entities generated successfully for chat {chat_id}.")
            except Exception as outline_err:
                logger.error(f"Failed to generate background outline or entities: {outline_err}")
        
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
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo),
    vector_service: PineconeVectorService = Depends(get_vector_service)
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
    
    # Group parent chunks by page number & filename
    page_nodes_dict = {}
    for chunk in chunks:
        page = chunk.get("page", 1)
        try:
            page = int(float(page))
        except (ValueError, TypeError):
            page = 1
        filename = chunk.get("filename", "")
        parent_text = chunk.get("parent", "")
        if not parent_text.strip():
            continue
            
        key = (filename, page)
        if key not in page_nodes_dict:
            page_nodes_dict[key] = parent_text
            
    # Formulate nodes list, filtering out redundant/duplicate conceptual headers
    temp_nodes = []
    sorted_keys = sorted(list(page_nodes_dict.keys()), key=lambda x: (x[0], x[1]))
    
    import re
    STOP_WORDS = {"and", "or", "the", "in", "of", "to", "for", "with", "on", "at", "a", "an", "is", "by", "from", "as", "about", "simple", "example", "examples", "case", "study", "using", "used"}
    ABBREVIATIONS = {
        "rep": "representation",
        "repr": "representation",
        "sys": "system",
        "mech": "mechanism",
        "rob": "robotics",
        "robot": "robotics",
        "eq": "equation",
        "eqs": "equations",
        "param": "parameter",
        "params": "parameters",
        "calc": "calculation",
        "fig": "figure"
    }

    BOILERPLATE_PREFIXES = [
        "applications of ", "application of ", "advantages of ", "disadvantages of ",
        "overview of ", "introduction to ", "intro to ", "types of ", "components of ",
        "features of ", "architecture of ", "principles of ", "basics of ", "summary of ",
        "understanding ", "methods of ", "techniques for ", "fundamentals of ",
        "a simple ", "simple ", "example of ", "examples of ", "case study of "
    ]

    def canonicalize_topic(raw_label: str) -> str:
        # Normalize Unicode hyphens and dashes (En-dash \u2013, Em-dash \u2014, minus \u2212) to standard ASCII '-'
        clean = re.sub(r'[\u2010-\u2015\u2212]', '-', raw_label.lower().strip())
        clean = re.sub(r'\[.*?\]', '', clean).strip()
        
        # Normalize Denavit-Hartenberg / D-H / D H / D_H / D.H. to "dh"
        clean = re.sub(r'\b(denavit[\s\-_]*hartenberg|d[\s\-_.]*h)\b', 'dh', clean)

        # Expand common abbreviations
        clean = re.sub(r'\b(rep|repre|repr|representations)\b', 'representation', clean)
        clean = re.sub(r'\b(sys|systems)\b', 'system', clean)
        clean = re.sub(r'\b(mech|mechs|mechanisms)\b', 'mechanism', clean)
        clean = re.sub(r'\b(rob|robot|robots)\b', 'robotics', clean)

        for prefix in BOILERPLATE_PREFIXES:
            if clean.startswith(prefix):
                clean = clean[len(prefix):].strip()
                break
        clean = re.sub(r'\.{2,}$', '', clean).strip()
        return clean

    def get_tokens(title: str) -> set:
        raw = re.sub(r'[^a-z0-9\s]', ' ', canonicalize_topic(title))
        return {t for t in raw.split() if t and t not in STOP_WORDS}

    def is_duplicate_concept(title_a: str, title_b: str) -> bool:
        canon_a = canonicalize_topic(title_a)
        canon_b = canonicalize_topic(title_b)
        if not canon_a or not canon_b:
            return False
            
        if canon_a == canon_b or canon_a in canon_b or canon_b in canon_a:
            return True
            
        tokens_a = get_tokens(title_a)
        tokens_b = get_tokens(title_b)
        if not tokens_a or not tokens_b:
            return False
            
        intersection = tokens_a.intersection(tokens_b)
        union = tokens_a.union(tokens_b)
        jaccard = len(intersection) / len(union) if union else 0.0
        
        min_tokens_count = min(len(tokens_a), len(tokens_b))
        overlap_ratio = len(intersection) / min_tokens_count if min_tokens_count > 0 else 0.0
        
        return jaccard >= 0.35 or overlap_ratio >= 0.50

    # Group pages into unique canonical concept nodes
    canonical_nodes = {}
    for key in sorted_keys:
        filename, page = key
        parent_text = page_nodes_dict[key]
        label = extract_topic_header(parent_text)
        canon = canonicalize_topic(label)
        
        # Skip generic outlines
        if canon in ["introduction", "summary", "conclusion", "references", "appendix", "table of contents", "outline", "concept node", ""]:
            continue

        matched_key = None
        for existing_canon in canonical_nodes.keys():
            if is_duplicate_concept(label, existing_canon):
                matched_key = existing_canon
                break

        if matched_key:
            canonical_nodes[matched_key]["text_snippet_list"].append(parent_text)
            if page not in canonical_nodes[matched_key]["pages"]:
                canonical_nodes[matched_key]["pages"].append(page)
        else:
            canonical_nodes[canon] = {
                "raw_label": label,
                "canon": canon,
                "filename": filename,
                "pages": [page],
                "text_snippet_list": [parent_text]
            }

    # Finalize nodes list by merging page numbers and text snippets
    nodes = []
    for idx, (canon_key, data) in enumerate(canonical_nodes.items()):
        full_text_merged = "\n\n".join(data["text_snippet_list"])
        snippet = full_text_merged[:200] + "..." if len(full_text_merged) > 200 else full_text_merged
        
        display_label = data["raw_label"]
        display_label = re.sub(r'[\u2010-\u2015\u2212]', '-', display_label)
        display_label = re.sub(r'\b(rep|repr)\b', 'representation', display_label, flags=re.IGNORECASE)
        display_label = re.sub(r'\s+', ' ', display_label).strip()

        min_p = min(data['pages'])
        max_p = max(data['pages'])
        pages_str = f"p.{min_p}" if min_p == max_p else f"p.{min_p}-{max_p}"
        
        nodes.append({
            "id": idx,
            "label": f"{data['filename']} - {pages_str}: {display_label}" if data['filename'] else f"{pages_str}: {display_label}",
            "raw_topic": display_label,
            "page": min_p,
            "filename": data["filename"],
            "text": snippet,
            "parent_full_text": full_text_merged
        })
        
    # Formulate edges list (link by semantic similarity of parent texts)
    edges = []
    num_nodes = len(nodes)
    if num_nodes > 1:
        try:
            texts = [n["parent_full_text"] for n in nodes]
            node_embeddings = vector_service.embeddings.embed_documents(texts)
            
            import numpy as np
            embeds = np.array(node_embeddings)
            norms = np.linalg.norm(embeds, axis=1, keepdims=True)
            normalized_embeds = embeds / np.where(norms == 0, 1e-9, norms)
            sim_matrix = np.dot(normalized_embeds, normalized_embeds.T)
            
            added_edges = set()
            for i in range(num_nodes):
                sims = [(sim_matrix[i][j], j) for j in range(num_nodes) if i != j]
                sims.sort(key=lambda x: x[0], reverse=True)
                for sim, j in sims[:2]:
                    if sim >= 0.55:
                        edge_pair = tuple(sorted([i, j]))
                        if edge_pair not in added_edges:
                            added_edges.add(edge_pair)
                            edges.append({"source": edge_pair[0], "target": edge_pair[1]})
            
            if len(edges) == 0:
                for i in range(num_nodes - 1):
                    edges.append({"source": i, "target": i + 1})
        except Exception as e:
            logger.error(f"Semantic linking failed, falling back to document order: {e}")
            for i in range(num_nodes - 1):
                edges.append({"source": i, "target": i + 1})
                    
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


@app.get("/chats/{chat_id}/extracted-entities")
async def get_extracted_entities(
    chat_id: str,
    chat_repo: SQLAlchemyChatRepository = Depends(get_chat_repo)
):
    chat = await chat_repo.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    results_json = chat.get("analysis_results_json")
    if not results_json:
        return {"dates": [], "names": [], "definitions": []}
    
    try:
        results = json.loads(results_json)
        return results.get("extracted_entities", {"dates": [], "names": [], "definitions": []})
    except Exception:
        return {"dates": [], "names": [], "definitions": []}


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