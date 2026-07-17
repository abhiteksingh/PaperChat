# Docent Architecture Guide — General File Chatbot

This guide explains the exact flow, RAG pipeline, and matching mechanics of the **General File Chatbot**. It is designed for beginners to understand how documents are uploaded, processed, searched, and queried.

---

## 1. Core Purpose (The "Why")
* **Goal**: Provide a generic, flexible document assistant for any files that do not fit a specific persona (such as standard research papers, reports, or documentation).
* **Target Audience**: General users needing summaries, search lookup, or text synthesis over standard file uploads.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload Files ] ──► [ Decoded UTF-8 Pages ] ──► [ Parent Chunks (1000t) ] ──► [ Child Chunks (250t) ]
                                                                                   │
                                                                                   ▼
                                                                        [ SQLite / Pinecone Index ]
```

### Step 1: Text Extraction
* When a user uploads a document, the system decodes the file bytes.
* If it is a PDF, the PyMuPDF reader extracts pages sequentially. If digital text is missing, RapidOCR runs on page images to extract scanned text.
* For plain text or markdown files (`.txt`, `.md`), the parser segment blocks into mock pages of 2500 characters so that page citations still work.

### Step 2: Parent-Child Chunking
* A standard document consists of large conceptual sections.
* **Parent Splitter**: Splices the text into overlapping parent blocks of **1,000 tokens** (overlap: 200). These hold the full contextual argument.
* **Child Splitter**: Splices each parent chunk into smaller child blocks of **250 tokens** (overlap: 50). These child blocks are used to generate compact embeddings.
* Why split? Small chunks generate more precise vector representation vectors, while parent chunks supply the LLM with enough surround text to draft comprehensive summaries.

---

## 3. Matching & Search Strategy (The "What")
When a user asks a question:
1. **Dense Vector Search**: The question is converted to a vector embedding using HuggingFace model configurations, looking up the top matching child vectors in the Pinecone namespace.
2. **Sparse Keyword Search (BM25)**: The question's tokens are queried against local SQLite document indexes to find exact keyword matches.
3. **Reciprocal Rank Fusion (RRF)**: Merges vector matches and keyword matches using rankings to identify the top 5 relevant document child nodes.
4. **Context Assembly**: The parent text blocks associated with the top-ranking child nodes are concatenated to build the context prompt.

---

## 4. Frontend & Backend Interactions

### Frontend Layout
* **Left Sidebar**: Lists upload history, active file references, and handles dragging graph nodes.
* **Middle Chat Feed**: Displays conversation bubbles, typing indicators, and clickable reference pills (e.g. `[p.3]`).
* **Right Pane**: Renders a force-directed **3D WebGL Concept Tree Graph** linking topics sequentially.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B.
* **Temperature**: `0.7` (allows for creative explanations, synthesis, and conversational fluid responses).
* **System Prompt**: Focuses on direct text summaries, matching user language, and outputting page references (`[p.X]`).
