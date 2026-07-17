import logging
from typing import TypedDict, List, Dict, Any
from langchain_core.prompts import PromptTemplate
from services.llm_service import GroqLLMService

logger = logging.getLogger(__name__)

class AuditorState(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: GroqLLMService

AUDITOR_PROMPT = """You are the Contract Compliance & Risk Auditor Agent. Your primary role is to rigorously review the provided context to answer the question.
If the answer cannot be directly verified or inferred from the context, state that you cannot verify it. Do not speculate.
At the end of your answer, list the exact page references that support your claims in the format: "[p.X]".

Context:
{context}

Question:
{question}

History:
{history}

Auditor Answer:"""

async def run_auditor_chat(state: AuditorState, history_text: str) -> Dict[str, Any]:
    llm = state["llm_service"]
    prompt = PromptTemplate(template=AUDITOR_PROMPT, input_variables=["context", "question", "history"])
    formatted_prompt = prompt.format(
        context=state["context"],
        question=state["question"],
        history=history_text
    )
    
    # We call Groq client directly using a model query
    raw_response = await llm.groq_client.chat.completions.create(
        model=llm.model_name,
        messages=[{"role": "user", "content": formatted_prompt}],
        temperature=0.0,  # Highly deterministic
    )
    
    answer = raw_response.choices[0].message.content
    tokens = raw_response.usage.total_tokens
    
    return {
        "answer": answer,
        "token_count": tokens
    }
