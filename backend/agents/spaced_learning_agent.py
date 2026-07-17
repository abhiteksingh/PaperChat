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

NOTEPAD_PROMPT = """You are the Spaced Learning & Document Digest Agent. Your primary role is to help outline, format, and draft structural memos, summaries, or essays based on the context.
Structure your output using markdown list bullet points or clear headings. Ensure you append source references like "[p.X]" to trace your claims.

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
