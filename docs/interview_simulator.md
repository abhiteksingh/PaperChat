# Docent Architecture Guide — CV Analyzer & Mock Interview Simulator

This guide explains the exact flow, RAG pipeline, and matching mechanics of the **CV Analyzer & Mock Interview Simulator**. It is designed for beginners to understand career coaching evaluations.

---

## 1. Core Purpose (The "Why")
* **Goal**: Prepare candidates for job interviews by highlighting resume gaps, comparing skills against job description criteria, and conducting interactive mock interviews.
* **Target Audience**: Job seekers, students, and engineers prepping for technical roles. It translates a static CV into an actionable training simulator.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload CV / Resume ] ──► [ Decoded Text ] ──► [ Entity Classifier ] ──► [ Sectional Meta Index ]
                                                                                   │
                                                                                   ▼
                                                                        [ Target JD Comparisons ]
```

### Step 1: Sectional Entity Extraction
* Resumes follow structured categories (Skills, Experience, Education).
* **The Parser**: Parses paragraphs and extracts specific candidate experience timelines and skillset keywords, organizing them into a structured metadata index.

### Step 2: Target Job Description Alignment
* Users paste target Job Descriptions (JD) directly into the analyzer.
* The matching loop cross-references the resume's skills list against the target JD's key requirements, highlighting matches and deficiencies.

---

## 3. Matching & Search Strategy (The "What")
* **Gap Analysis Diff**: Computes a comparison list identifying:
  * *Strengths*: Matches between resume skills and job requirements.
  * *Gaps*: Core requirements listed in the JD that are absent from the resume.
  * *Vague Claims*: Qualitative phrases (e.g. *"assisted in design"*) flagged to be backed by numeric metrics.
* **STAR Assessor**: Evaluates chat responses during mock interviews against the **Situation, Task, Action, Result** (STAR) methodology, tracking which sections need harder details.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Interview Board)
* **Left Sidebar (CV Profile Summary)**: Displays parsed CV details and historical mock rounds lists.
* **Middle Chat Feed**: The mock roleplay simulation feed where the AI acts as an interviewer and parses candidate replies.
* **Right Pane (Forensic Utilities)**:
  * **CV Gap Analyzer**: Interactive list showing Strengths, Gaps, and Imprecise Claims against JDs.
  * **STAR Assessor Panel**: Logs checklist results for each mock answer (Situation, Task, Action, Result) with recommendations.
  * **Session progression charts**: Displays progress scores.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B.
* **Temperature**: `0.3` (structured, focused questions mapping realistic HR and technical rounds, with minimal divergence).
* **System Prompt**: Enforces professional interviewer persona, prompts STAR metrics, evaluates resume credentials, and includes page reference brackets `[p.X]`.
