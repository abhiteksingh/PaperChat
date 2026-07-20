# Docent Architecture Guide — Contract Compliance & Risk Auditor

This guide explains the flow, RAG pipeline, and quantitative matching mechanics of the **Contract Compliance & Risk Auditor**. It is designed for beginners to understand how vendor agreements and contracts are analyzed for compliance.

---

## 1. Core Purpose (The "Why")
* **Goal**: Rigorously analyze contracts for liabilities, compliance gaps, missing standard clauses, and critical obligation deadlines.
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
* Contracts are parsed page-by-page. Chunks are split into very small segments (**200 tokens**) to ensure that a single nested sentence (e.g., an indemnification limit waiver) is not diluted by surrounding boilerplate text.

### Step 2: Parent-Child Retrieval
* Small chunks are indexed in Pinecone. When retrieved, the engine pulls the larger parent block (**1,000 tokens**) representing the entire section or clause group to ensure the LLM receives the full legal context.

### Step 3: Absent Protections Hybrid Scan
* During file upload, the background parser runs a hybrid scan (`detect_missing_clauses_hybrid`) searching for standard protective clauses:
  * **DPA (Data Processing Addendum)**: Critical for GDPR/data compliance.
  * **Limitation of Liability**: Protects against uncapped damages.
  * **Force Majeure**: Excuses performance during extreme events.
* Returns a list of missing items rendered in the left workbook sidebar.

---

## 3. Matching & Search Strategy (The "What")
* **BM25 Dominance**: The search engine prioritizes BM25 sparse keyword lookup because contracts rely on exact keyword syntax and numbered references (e.g., *Section 14.1*, *IP Indemnity*).
* **NLI Validation**: Answers are strictly validated against context. If a clause or limit cannot be verified, the model explicitly states it cannot find it, rather than hallucinating options.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Three-Pane Audit Deck)
* **Left Sidebar (Risk Heatmap & Absent Protections)**:
  * Page list tagged by severity alerts (Red: severe liability, Amber: ambiguous terms, Green: standard clause).
  * **Absent Protections list**: Flagging missing DPAs, liability caps, or force majeure terms.
* **Middle Chat Feed**: Compliance dialogue workspace showing audit replies.
* **Right Pane (Clause & Obligation Utilities)**:
  * **Compliance Score Gauge**: A visual gauge (0-100) scoring the contract. Clicking it expands an interactive **SVG Radar Chart** plotting risk across 4 axes: Financial Exposure, IP/Liability, Termination Risks, and Ambiguity.
  * **Obligation Timeline**: Chronological vertical tracker plotting extracted notice dates and renewal obligations.
  * **Redline Suggestions Cards**: Recommends safe rewrite terms with copy-to-clipboard options.
  * **Contradiction Conflict Logs**: Highlights conflicting terms (e.g. payment due dates listed as both Net-30 and Net-60).

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B at temperature `0.0` (absolute consistency, zero creativity).
* **System Prompt**: Enforces red-teaming compliance verification, radar score evaluations, and requires direct page reference bracket tags (`[p.X]`).
