import logging
from typing import TypedDict, List, Dict, Any
from langchain_core.prompts import PromptTemplate
from services.llm_service import GroqLLMService

logger = logging.getLogger(__name__)

class NotepadState(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: GroqLLMService

NOTEPAD_PROMPT = """You are the Spaced Learning & Document Digest Agent. Your primary role is to help outline, format, and draft structural study memos, summaries, and rich active recall items based on the document context.

Special Instruction for Greetings/Casual Chat:
If the user's question is a simple greeting (such as "hi", "hello", "hey", "greetings") or casual small talk, do NOT generate any summaries or flashcards based on the history or context. Instead, respond with a brief, friendly greeting and ask the user what they want to study.

Structure your response text using clean paragraphs and markdown list bullet points. Append page source references like "[p.X]".

At the absolute end of your response, you MUST append a structured JSON payload enclosed in <json_payload> and </json_payload> tags.
This JSON payload must strictly contain fields representing key concepts and recall metrics:
- "flashcards": an array of up to 4 rich study cards: [{{"id": int, "topic": "Canonical Topic Name", "question": "Active recall question about this concept", "summary": "1-2 sentence core takeaway explanation", "answer_hint": "Key points or expected answer check", "citation": "[p.X]", "interval": "New" | "Due in 1 day" | "Due in 4 days" | "Reviewed today", "grade": "New" | "Again" | "Good" | "Easy", "type": "FLASHCARD" | "PRACTICE_PROBLEM", "chapter": "Chapter X: Topic Name"}}]
- "heatmap": an array of up to 4 concepts with user confidence tags and measured status: [{{"name": "Canonical Topic Name", "level": "LOW" | "MEDIUM" | "HIGH", "color": "#FF4C4C" | "#FFC107" | "#3ECF8E", "measured_performance": float (0.0 to 1.0)}}]

Context:
{context}

Question:
{question}

History:
{history}

Notepad Draft Outline:"""

async def run_notepad_chat(state: NotepadState, history_text: str) -> Dict[str, Any]:
    llm = state["llm_service"]
    prompt = PromptTemplate(template=NOTEPAD_PROMPT, input_variables=["context", "question", "history"])
    formatted_prompt = prompt.format(
        context=state["context"],
        question=state["question"],
        history=history_text
    )
    
    raw_response = await llm.groq_client.chat.completions.create(
        model=llm.model_name,
        messages=[{"role": "user", "content": formatted_prompt}],
        temperature=0.5, # Slightly creative for writing
    )
    
    answer = raw_response.choices[0].message.content
    tokens = raw_response.usage.total_tokens
    
    return {
        "answer": answer,
        "token_count": tokens
    }
