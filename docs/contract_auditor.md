# Docent Architecture Guide — Contract Compliance & Risk Auditor

This guide explains the exact flow, RAG pipeline, and matching mechanics of the **Contract Compliance & Risk Auditor**. It is designed for beginners to understand how vendor agreements and contracts are analyzed for compliance.

---

## 1. Core Purpose (The "Why")
* **Goal**: Rigorously analyze contracts for liabilities, compliance gaps, and critical obligation deadlines.
* **Target Audience**: Founders, operations managers, and business coordinators. It is configured as a "gut-check" tool (accompanied by clear "not legal advice" notices) to review vendor agreements before signing.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload Contract ] ──► [ Decoded PDF/Word Pages ] ──► [ Target Chunks (200t) ] ──► [ Parent Context (1000t) ]
                                                                                       │
                                                                                       ▼
                                                                             [ SQLite / BM25 Index ]
```

### Step 1: Strict Character Parsing
* Contracts are parsed with fitz page-by-page. For Word documents (`.docx`), paragraphs are extracted.
* Chunks are split into very small segments (**200 tokens**) to ensure that a single nested sentence (e.g., an indemnification limit waiver) is not diluted by surrounding boilerplate text.

### Step 2: Parent-Child Retrieval
* Small chunks are indexed in Pinecone. When retrieved, the engine pulls the larger parent block (**1,000 tokens**) representing the entire section or clause group.
* This ensures the LLM receives the full legal context surrounding the contract section rather than just a fragmented sentence.

---

## 3. Matching & Search Strategy (The "What")
* **BM25 Dominance**: While vector embeddings capture conceptual similarity, contracts rely on exact keyword syntax and numbered references (e.g., *Section 14.1*, *IP Indemnity*, *Governing Law*). The search engine prioritizes BM25 sparse keyword lookup.
* **Metadata Scope Filtering**: Drag-and-drop actions constrain searches strictly to the selected page numbers (e.g., matching coordinates passed as query variables).
* **NLI Validation**: Answers are strictly validated against context. If a clause or limit cannot be verified, the model explicitly states it cannot find it, rather than hallucinating options.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Three-Pane Audit Deck)
* **Left Sidebar (Risk Heatmap Index)**: Lists contract pages tagged by severity alerts (Red: severe liability, Amber: ambiguous terms, Green: standard clause).
* **Middle Chat Feed**: Compliance dialogue workspace showing audit replies.
* **Right Pane (Clause & Obligation Utilities)**:
  * **Severity Score Gauge**: Live visual dial (0-100) scoring the contract's risk.
  * **Obligation Timeline**: Chronological vertical tracker plotting extracted deadlines (notice dates, renewals).
  * **Redline Export**: A copy-to-clipboard log of flagged contract risks.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B.
* **Temperature**: `0.0` (zero creativity/hallucinations, absolute adherence to text criteria).
* **System Prompt**: Enforces red-teaming compliance verification, clause evaluations, and requires direct page reference bracket tags (`[p.X]`).
