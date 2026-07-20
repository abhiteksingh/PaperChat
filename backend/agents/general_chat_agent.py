import logging
import json
import re
from typing import TypedDict, List, Dict, Any
from langchain_core.prompts import PromptTemplate
from services.llm_service import GroqLLMService

logger = logging.getLogger(__name__)

class ChatState(TypedDict):
    chat_id: str
    context: str
    question: str
    answer: str
    token_count: int
    llm_service: GroqLLMService

GENERAL_CHAT_PROMPT = """You are the General File Chatbot. Your goal is to help the user synthesize, analyze, and query their uploaded files.
You must be generic, professional, and have no fixed persona.

Citations:
You must cite the source filename and page using brackets for each claim made, e.g. "[filename.pdf, p.X]". Do not omit citations.

Context:
{context}

Question:
{question}

History:
{history}

Instructions for output formatting:
1. Detect the user's question intent:
   - If it is a structured extraction request (e.g. listing dates, extracting names, structural parameter lists), return the answer formatted strictly in a Markdown table or list.
   - If it is a deep-dive request, explain the concepts thoroughly with structured sections.
   - Otherwise, answer clearly, conversationally, and directly. Do not include introductory metadata, file summaries, or meta-attribution tags (like Source Confidence tags) at the start of your answer.
2. Multi-Document Comparison:
   - Only if the context contains multiple files with conflicting information, highlight discrepancies in a clear, structured way. Do not output meta-statements about the files checked if there are no conflicts.
3. Explanatory Suggestions:
   - At the absolute end of your response, you MUST generate 2-3 follow-up suggestions for what the user should ask next. Ground these suggestions in nearby or related concepts. Enclose these suggestions inside <suggestions> and </suggestions> tags as a JSON list, for example:
   <suggestions>["What is the PyQt5 threading safety limit?", "How does WMI screen brightness control work?"]</suggestions>

General Chat Answer:"""

async def run_general_chat(state: ChatState, history_text: str) -> Dict[str, Any]:
    llm = state["llm_service"]
    prompt = PromptTemplate(template=GENERAL_CHAT_PROMPT, input_variables=["context", "question", "history"])
    formatted_prompt = prompt.format(
        context=state["context"],
        question=state["question"],
        history=history_text
    )
    
    raw_response = await llm.groq_client.chat.completions.create(
        model=llm.model_name,
        messages=[{"role": "user", "content": formatted_prompt}],
        temperature=0.7,  # Groq LLaMA temp 0.7
    )
    
    answer = raw_response.choices[0].message.content
    tokens = raw_response.usage.total_tokens
    
    # Extract suggestions if present
    suggestions = []
    match = re.search(r"<suggestions>(.*?)</suggestions>", answer, re.DOTALL)
    if match:
        try:
            suggestions = json.loads(match.group(1).strip())
            # Strip tags from answer text
            answer = answer.replace(match.group(0), "").strip()
        except Exception as e:
            logger.error(f"Failed to parse suggestions payload: {e}")
            
    return {
        "answer": answer,
        "token_count": tokens,
        "suggestions": suggestions
    }
