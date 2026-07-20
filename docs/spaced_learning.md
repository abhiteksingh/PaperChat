# Docent Architecture Guide — Spaced Learning & Document Digest

This guide explains the flow, RAG pipeline, and quantitative matching mechanics of the **Spaced Learning & Document Digest**. It is designed for beginners to understand active recall learning integrations.

---

## 1. Core Purpose (The "Why")
* **Goal**: Maximize concept retention, textbook review efficiency, and student spaced repetition study routines through evidence-backed retention science.
* **Target Audience**: Students, developers, and academic researchers preparing for exams or case study reviews. It moves away from passive reading to active recall challenges.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload Textbook ] ──► [ Decoded Pages ] ──► [ Concept Chunks (500-800t) ] ──► [ Summary Abstractions ]
                                                                                      │
                                                                                      ▼
                                                                             [ Vector Databases ]
```

### Step 1: Conceptual Splitter
* Textbook blocks are split into medium-large blocks (**500 to 800 tokens**) to ensure that complete descriptions, proofs, and definitions are not separated.

### Step 2: Summary Abstractions
* Alongside standard text chunks, the RAG engine extracts paragraph headings and takeaways to build a summary mapping layer, which powers the chapter index listed in the workbook.

---

## 3. Matching & Search Strategy (The "What")

* **Socratic Dialogue & Tutor Question Injections**: The RAG search retrieves relevant concept context based on the user's study topics, drafts explanations, and appends Socratic follow-up questions to test recall.
* **Forgetting Curve Prediction & Half-Life**:
  * Employs the retention decay model: $R = e^{-t / H}$
  * The half-life $H$ is calculated from flashcard grade histories: doubled for "Good", tripled for "Easy", set to 1 day for "Again".
  * If a concept's retrievability falls below $70\%$ before the student-defined `exam_date`, it is flagged with a **Forgetting Risk warning** and resurfaced ahead of schedule.
* **Session-End Retrieval Practice (Closed-Book Quiz)**:
  * Generates short retrieval questions covering the current session's study themes.
  * Students type their recall answers closed-book. Expected details are revealed side-by-side for self-grading.
* **Interleaved Review Queues**:
  * Instead of presenting flashcards in single-chapter blocks, the queue interleaves concepts across different chapters and topics, which increases long-term contextual learning retention.
* **Practice Problems & Quizzes**:
  * RAG generates procedurally heavy practice problems (`PRACTICE_PROBLEM`) distinct from standard flashcards (`FLASHCARD`) for procedural topics (math, sciences).
* **Elaborative Interrogation Prompts**:
  * Periodic connecting prompts (e.g. *"Why does this relationship hold true?"* or *"How does this connect to prior concept X?"*) to encourage conceptual integration.
* **Audited Confidence Heatmaps**:
  * Audits user-reported confidence levels against actual recall histories to expose overconfidence/underestimation gaps.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Split Notion Study Panel)
* **Left Sidebar (Chapters Index)**: Displays chapters with auto-derived badges ("Mastered" if success rate >= 66%, "Needs Review" otherwise) with manual toggle overrides.
* **Left-Center Workspace (Notion Text Area Canvas)**:
  * An editor that compiles summary logs.
  * Displays calendar inputs for `exam_date` and warning messages for forgetting curve risks.
  * Triggers closed-book session-end recall tests.
* **Right Pane (Spaced Recall Utilities)**:
  * **Spaced Repetition Flashcards Queue (Anki-Style)**: Alternates interleaved flashcards and practice problems.
  * **Audited Confidence Matrix Grid**: Maps topics and highlights overconfidence gaps.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B at temperature `0.5`.
* **System Prompt**: Enforces Socratic dialogue methods, compiles summary takeaways, and appends citations `[p.X]`.
