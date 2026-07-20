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

Interviewer Persona Severity Calibrated for Seniority Tier: {seniority_tier}
- NEW_GRAD: Focus on engineering fundamentals, data structures, academic projects. Be supportive and instructive.
- MID: Focus on practical application, coding patterns, testing. Ask about concrete features they built.
- SENIOR: Focus on system design, trade-offs, architecture, and team leading. Question their technical decisions aggressively.
- STAFF: Focus on cross-team technical strategy, scaling, organizational impact, and high-level architectural foresight. Be highly demanding and critique vagueness.

Additionally, at the absolute end of your response, you MUST append a structured JSON payload enclosed in <json_payload> and </json_payload> tags.
This JSON payload must strictly contain fields representing CV profile gap evaluation, consistency checks, rewrite suggestions, and competency scores:
- "cv_analysis": an object containing lists of parsed criteria from the resume:
    - "strengths": an array of up to 2 candidate strengths (e.g. ["Solid Python."])
    - "gaps": an array of up to 2 missing skills compared to JD, categorized by severity:
        [{"label": "Gap name", "severity": "CRITICAL" | "MINOR", "rationale": "Why this is critical/minor"}]
    - "vagueClaims": an array of up to 2 imprecise statements needing metrics
- "star_feedback": an array of up to 4 STAR elements grading the candidate's last answer in the history:
    [{"id": int, "criteria": "SITUATION" | "TASK" | "ACTION" | "RESULT", "comment": "Feedback", "pass": bool, "rewrite_suggestion": "Tightened, professional rewrite of this aspect using the candidate's details"}]
- "consistency_flags": an array of up to 2 flags where candidate's statements in history contradict or inflate claims made in their resume context (e.g., resume says 'assisted' but interview response claims 'designed and led'):
    [{"clause": "Claim topic", "discrepancy": "Candidate claimed X but resume states Y"}]
- "scores": an object grading their overall interview performance this turn (out of 100):
    {"communication_clarity": int, "technical_depth": int, "star_completeness": int}

Context:
{context}

Question:
{question}

History:
{history}

Detective Findings:"""

async def run_detective_chat(state: DetectiveState, history_text: str) -> Dict[str, Any]:
    import json
    chat_repo = state.get("chat_repo")
    seniority_tier = "MID"
    if chat_repo:
        chat = await chat_repo.get_chat(state["chat_id"])
        if chat and chat.get("analysis_results_json"):
            try:
                parsed = json.loads(chat["analysis_results_json"])
                seniority_tier = parsed.get("seniority_tier", "MID")
            except Exception:
                pass

    llm = state["llm_service"]
    prompt = PromptTemplate(template=DETECTIVE_PROMPT, input_variables=["context", "question", "history", "seniority_tier"])
    formatted_prompt = prompt.format(
        context=state["context"],
        question=state["question"],
        history=history_text,
        seniority_tier=seniority_tier
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
