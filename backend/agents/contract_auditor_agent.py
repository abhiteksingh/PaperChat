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

Additionally, at the absolute end of your response, you MUST append a structured JSON payload enclosed in <json_payload> and </json_payload> tags.
This JSON payload must strictly contain fields representing the compliance, conflicts, and obligation context from the document:
- "compliance_score": an integer between 0 and 100 rating compliance (lower score for critical risks or ambiguity).
- "confidence": "VERIFIED" (fully backed by exact text) or "INFERRED" (conceptually deduced but not explicitly stated).
- "radar_scores": an object mapping 4 risk axes to scores (0-100, where 100 is best/lowest risk) and contributing clauses:
    {"Financial Exposure": {"score": int, "clauses": ["Description of clause & weight %"]},
     "IP/Liability": {"score": int, "clauses": ["Description of clause & weight %"]},
     "Termination & Exit Risk": {"score": int, "clauses": ["Description of clause & weight %"]},
     "Operational Risk": {"score": int, "clauses": ["Description of clause & weight %"]}}
- "vulnerabilities": an array of up to 3 objects representing compliance issues found: 
    [{"id": int, "label": "Vulnerability summary name", "type": "CRITICAL" | "WARNING" | "AMBIGUOUS", "page": int, "text": "details of the clause/risk", "suggested_redline": "wording of suggested counter-clause draft (e.g. 'cap liability at 12 months fees')", "market_benchmark": "comparison against market-standard terms (e.g. 'Your notice: 10 days. Market standard: 30-60 days')", "confidence": "VERIFIED" | "INFERRED"}]
- "obligations": an array of up to 3 date deadlines or obligations: [{"date": "Oct 12, 2026", "event": "Obligation event name", "status": "PENDING" | "ALERT" | "COMPLETED"}]
- "conflicts": an array of contradiction/interaction conflicts found between clauses: [{"title": "Conflict title", "clauses": ["Section 4.1", "Section 12.2"], "description": "how these clauses contradict or conflict", "confidence": "VERIFIED" | "INFERRED"}]

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
