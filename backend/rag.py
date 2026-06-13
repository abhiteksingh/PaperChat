from pypdf import PdfReader
import os
import io
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import shutil
from ddgs import DDGS

async def extract_pdf_text(files):
        combined_text = ""

        for file in files:
            pdf_bytes = await file.read()

            reader =  PdfReader(io.BytesIO(pdf_bytes))

            for page in reader.pages:
                text = page.extract_text()

                if text:
                    combined_text += text + "\n"

        return combined_text


def split_text(text : str):
     
    splitter = RecursiveCharacterTextSplitter(
         chunk_size = 500,
         chunk_overlap = 100
    )

    chunks = splitter.split_text(text)

    return chunks
def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name = "sentence-transformers/all-MiniLM-L6-v2"
)

def create_vector_store(chunks,embeddings):
     
    vector_store = FAISS.from_texts(
          texts = chunks,
          embedding= embeddings
     )
    
    return vector_store


def retrieval_chunks(question,vector_store):
     
    docs = vector_store.similarity_search_with_score(
         question,
         k=3
    )

    return docs

def save_vector_store(vector_store,chat_id):
     path = f"vectorstores/{chat_id}"

     os.makedirs("vectorstores", exist_ok = True)
     vector_store.save_local(path)

def load_vector_store(chat_id,embeddings):
     path = f"vectorstores/{chat_id}"

     vector_store = FAISS.load_local(
          path,
          embeddings,
          allow_dangerous_deserialization=True
     )

     return vector_store

def delete_vector_store(chat_id):
     
     shutil.rmtree(
          f"vectorstores/{chat_id}",
          ignore_errors=True
     )

def web_search_context(query):
    try:
        with DDGS() as ddgs:
            results = list(
                ddgs.text(
                    query,
                    max_results=5
                )
            )

        return "\n\n".join(
            result["body"]
            for result in results
        )

    except Exception as e:
        print("Web search failed:", e)
        return ""