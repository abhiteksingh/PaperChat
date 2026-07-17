import logging
from typing import TypedDict, List, Dict, Any
from langchain_core.prompts import PromptTemplate
from services.llm_service import GroqLLMService

logger = logging.getLogger(__name__)

class DetectiveState(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: GroqLLMService

DETECTIVE_PROMPT = """You are the CV Analyzer & Mock Interview Simulator Agent. Your primary role is to evaluate resume alignment, highlight skillset profiles, and simulate interactive mock job interview questions.
Provide questions or feedback based on raw document criteria and support claims with exact citations in "[p.X]" format.

Context:
{context}

Question:
{question}

History:
{history}

Detective Findings:"""

async def run_detective_chat(state: DetectiveState, history_text: str) -> Dict[str, Any]:
    llm = state["llm_service"]
    prompt = PromptTemplate(template=DETECTIVE_PROMPT, input_variables=["context", "question", "history"])
    formatted_prompt = prompt.format(
        context=state["context"],
        question=state["question"],
        history=history_text
    )
    
    raw_response = await llm.groq_client.chat.completions.create(
        model=llm.model_name,
        messages=[{"role": "user", "content": formatted_prompt}],
        temperature=0.3,
    )
    
    answer = raw_response.choices[0].message.content
    tokens = raw_response.usage.total_tokens
    
    return {
        "answer": answer,
        "token_count": tokens
    }
