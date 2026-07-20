# Docent Architecture Guide — General File Chatbot

This guide explains the exact flow, RAG pipeline, and matching mechanics of the **General File Chatbot** (`workspace_type="chat"`). It provides a detailed breakdown of how documents are uploaded, ingested across multiple file formats, indexed, searched, and queried.

---

## 1. Core Purpose (The "Why")
* **Goal**: Provide a generic, flexible document assistant for files that do not fit a specialized persona (such as research papers, user manuals, reports, or general documentation).
* **Target Audience**: General users needing multi-format file synthesis, Q&A lookup, interactive citation verification, and follow-up prompt suggestions.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload Multi-Format Files ] ──► [ Page Extraction & OCR ] ──► [ Parent Chunks (1200 chars) ]
                                                                             │
                                                                             ▼
                                                                  [ Child Chunks (300 chars) ]
                                                                             │
                                                     ┌───────────────────────┴───────────────────────┐
                                                     ▼                                               ▼
                                         [ Pinecone Vector Index ]                        [ SQLite Chunks Cache ]
```

### Step 1: Multi-Format Text Extraction
* **PDF Ingestion**: PyMuPDF (`fitz`) extracts page text sequentially. For scanned pages without a digital text layer, local **RapidOCR (onnxruntime)** renders 2x zoom page images and extracts text (capped at 10 OCR pages per document, max 100 total pages).
* **Office Documents (DOCX/PPTX/XLSX)**: Parsed using native, zero-dependency Python standard libraries (`zipfile` and `xml.etree.ElementTree`) to ensure fast, lightweight ingestion without external OS binary dependencies.
* **Text & Code Files (TXT/MD/CSV)**: Text and CSV rows are chunked into structured pseudo-pages (~2,500 characters or 30 rows per page) so page-level citations work uniformly across all file types.

### Step 2: Parent-Child Chunking Strategy
* **Parent Splitter**: Splices extracted text into overlapping parent blocks of **1,200 characters** (overlap: 200). These blocks maintain full contextual arguments for LLM prompt context.
* **Child Splitter**: Splices parent chunks into smaller child blocks of **300 characters** (overlap: 50). These compact chunks produce highly dense and precise vector embeddings.
* **Why Parent-Child?**: Small child chunks maximize semantic similarity retrieval precision, while the corresponding parent chunks provide the LLM with sufficient surrounding context.

### Step 3: Dual Storage & Indexing
* **Dense Embeddings**: Local HuggingFace embeddings (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions) are generated and indexed into **Pinecone** namespaces isolated by `chat_id`.
* **Sparse Cache**: Full parent-child mappings (`chunks_json`) are stored in **SQLite** (`chat.db`) to enable in-memory BM25 sparse keyword searches.

---

## 3. Matching & Search Strategy (The "What")

When a user asks a question, the backend performs hybrid retrieval:
1. **Dense Vector Search**: Queries Pinecone for the top 5 nearest vector matches (filtered by similarity score $\ge 0.45$). Optional page filtering (`page=X`) is supported.
2. **Sparse Keyword Search (BM25)**: Evaluates user query terms against cached child chunks using a hand-coded in-memory `SimpleBM25` algorithm (filtered by score $> 0.0$).
3. **Reciprocal Rank Fusion (RRF)**: Merges dense and sparse rankings using RRF ($k=60$) to extract the top 3 most relevant parent context blocks.
4. **Context Assembly & Topic Extraction**: Topic headers are extracted using `extract_topic_header()` for each block and formatted with source labels (e.g., `[Source: document.pdf, Page X]`).

---

## 4. Frontend & Backend Interactions

### Backend Agent Logic (`backend/agents/general_chat_agent.py`)
* **LLM Engine**: Groq `llama-3.3-70b-versatile`.
* **Temperature**: `0.7` (enables creative synthesis and fluid conversational explanations).
* **Citations**: Requires strict bracketed citations (e.g. `[filename.pdf, p.X]`).
* **Automated Suggestions**: Generates 2–3 follow-up prompt suggestions wrapped in `<suggestions>` JSON tags at the end of responses.

### Frontend Workspace (`frontend/src/workspaces/general/GeneralWorkspace.jsx`)
* **Isolated Sidebar (`GeneralSideBar.jsx`)**: Manages general chat sessions (`GET /chats?workspace_type=chat`) and file upload dropzones.
* **Center Chat Panel**: Displays message bubbles with expandable inline citations, token usage metrics, context chip drag-and-drop filtering (`[Context: p.X - header]`), and follow-up suggestion chips.
* **Entity Extractor Clipboard (`EntityExtractorClipboard.jsx`)**: Right-pane utility allowing users to pin reference excerpts and extract structured entities.
