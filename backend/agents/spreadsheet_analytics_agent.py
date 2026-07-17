import logging
from typing import TypedDict, List, Dict, Any
from langchain_core.prompts import PromptTemplate
from services.llm_service import GroqLLMService

logger = logging.getLogger(__name__)

class SandboxState(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: GroqLLMService

SANDBOX_PROMPT = """You are the Spreadsheet Analytics & Quantitative Sandbox Agent. Your role is to break down mathematical formulas, financial metrics, and operational datasets from the context.
Provide variables breakdowns, explain calculations clearly, and list page citations in "[p.X]" format.

Context:
{context}

Question:
{question}

History:
{history}

Sandbox Solution:"""

async def run_sandbox_chat(state: SandboxState, history_text: str) -> Dict[str, Any]:
    llm = state["llm_service"]
    prompt = PromptTemplate(template=SANDBOX_PROMPT, input_variables=["context", "question", "history"])
    formatted_prompt = prompt.format(
        context=state["context"],
        question=state["question"],
        history=history_text
    )
    
    raw_response = await llm.groq_client.chat.completions.create(
        model=llm.model_name,
        messages=[{"role": "user", "content": formatted_prompt}],
        temperature=0.1, # Mathematical consistency
    )
    
    answer = raw_response.choices[0].message.content
    tokens = raw_response.usage.total_tokens
    
    return {
        "answer": answer,
        "token_count": tokens
    }
