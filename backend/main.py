from langgraph.graph import StateGraph,START,END
import os
from typing import TypedDict
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_groq import ChatGroq
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File
from database import init_db , load_messages , save_message , load_chats , delete_chat , create_chat
from PromptTemplate import PDF_PROMPT
from schemas import Request_Delete , Request_Format , Request_Messages
from rag import extract_pdf_text , split_text , get_embeddings , create_vector_store , retrieval_chunks , save_vector_store , load_vector_store , delete_vector_store , web_search_context
from litellm import token_counter

load_dotenv()

app = FastAPI()

init_db()

primary_llm = ChatGroq(model= "llama-3.3-70b-versatile" , temperature= 0)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class State(TypedDict):
    chat_id : str
    context : str
    question : str
    answer : str
    token_count : int

embeddings = get_embeddings()

async def chat_node(state: State):

    history = load_messages(state["chat_id"])

    history_text = "\n".join(
         f"{msg['role']} : {msg['content']}"
         for msg in history[-10:]
    )

    prompt = PDF_PROMPT.invoke({
         "context" : state["context"],
         "question" : state["question"],
         "history" : history_text 
    })

    
    response = await primary_llm.ainvoke(prompt)

    prompt_tokens = token_counter(
         model= "llama-3.3-70b-versatile",
         text = prompt.to_string()
    )

    completion_tokens = token_counter(
         model= "llama-3.3-70b-versatile",
         text = response.content
    )

    return {
        "answer" : response.content,
        "token_count" : prompt_tokens + completion_tokens
    }

chat_graph = StateGraph(State)

chat_graph.add_node("chat", chat_node)

chat_graph.add_edge(START,"chat")
chat_graph.add_edge("chat",END)

chat_workflow = chat_graph.compile()


@app.post("/chat")
async def pdf_chat(req : Request_Format):
    
    vector_store = load_vector_store(req.chat_id , embeddings)

    docs = retrieval_chunks(req.question,vector_store)

    best_score = docs[0][1]

    pdf_context = "\n\n".join(
        doc.page_content
        for doc, score in docs
    )

    context = pdf_context

    sources = ["pdf"]

    if best_score > 1.2:
        web_context = web_search_context(req.question)

        if web_context:
            context += "\n\nWeb Information:\n" + web_context
            sources.append("web")

    question = req.question.strip()

    save_message(
         req.chat_id, "user" , req.question , None
    )
         
    response = await chat_workflow.ainvoke({
        "context" : context,
        "question" : question,
        "chat_id" : req.chat_id
    })

    save_message(
        req.chat_id,"assistant",response["answer"],response["token_count"]
    )
    return {
        "answer" : response["answer"],
        "sources" : sources,
        "token_count" : response["token_count"]
    }

@app.post("/upload")
async def upload_chat(files : list[UploadFile] = File(...)):

        text = await extract_pdf_text(files)

        chunks = split_text(text)

        vector_store = create_vector_store(chunks,embeddings)

        title = os.path.splitext(files[0].filename)[0]

        chat_id = create_chat(title)

        save_vector_store(
             vector_store,
             chat_id
        )
        
        return {
            "chat_id" : chat_id,
            "title" : title
        }

@app.post("/messages")
async def get_messages(req : Request_Messages):
    messages = load_messages(req.chat_id)

    return{
         "messages" : messages
    }

@app.get("/chats")
def get_chats():
     
     chats = load_chats()

     return {
          "chats" : chats
     }


@app.delete("/delete")
def chat_delete(req : Request_Delete):
     
     delete_chat(req.chat_id)

     delete_vector_store(req.chat_id)

     return {
          "success" : True
     }