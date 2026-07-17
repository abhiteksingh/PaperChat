# Docent Architecture Guide — Spaced Learning & Document Digest

This guide explains the exact flow, RAG pipeline, and matching mechanics of the **Spaced Learning & Document Digest**. It is designed for beginners to understand active recall learning integrations.

---

## 1. Core Purpose (The "Why")
* **Goal**: Maximize concept retention, textbook review efficiency, and student spaced repetition study routines.
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
* Textbooks and lecture notes rely on conceptual sections.
* Chunks are split into medium-large blocks (**500 to 800 tokens**) to ensure that complete descriptions, proofs, and definitions are not separated.

### Step 2: Summary Abstractions
* Alongside standard text chunks, the RAG engine extracts paragraph headings and conceptual takeaways to build a summary mapping layer.
* This summary map is what powers the chapter index listed in the study panel.

---

## 3. Matching & Search Strategy (The "What")
* **Socratic Dialogue Match**: The RAG search retrieves relevant concept context based on the user's study topics.
* **Tutor Question Injections**: Instead of just outputting answers, the backend retrieves context, drafts the explanation, and then appends a Socratic follow-up question (e.g. *"Now, how would you apply this vector math to a sparse RAG search?"*) to test user recall.
* **Self-Grading feedback**: Flashcard responses are graded by the user (Again / Good / Easy), adjusting scheduling deadlines in the database logs.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Split Notion Study Panel)
* **Left Sidebar (Chapters Index)**: Navigation table of contents with checkboxes to mark sections as "Mastered" or "Needs Review".
* **Left-Center Workspace (Notion Text Area Canvas)**: A Notion-style markdown text co-editor that automatically compiles study summaries as the AI dialogue progresses.
* **Right Pane (Spaced Recall Utilities)**:
  * **Spaced Repetition Flashcards Queue (Anki-Style)**: An active flashcard deck tracking due dates and intervals.
  * **Confidence Heatmap**: A 2D grid matrix mapping study topics against user self-confidence levels (Low/Medium/High).

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B.
* **Temperature**: `0.5` (balanced creativity for educational analogies while maintaining strict accuracy).
* **System Prompt**: Enforces Socratic dialogue methods, questions assumptions, compiles text takeaways, and appends citations `[p.X]`.
