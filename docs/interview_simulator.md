# Docent Architecture Guide — CV Analyzer & Mock Interview Simulator

This guide explains the flow, RAG pipeline, and quantitative matching mechanics of the **CV Analyzer & Mock Interview Simulator**. It is designed for beginners to understand career coaching evaluations.

---

## 1. Core Purpose (The "Why")
* **Goal**: Prepare candidates for job interviews by highlighting resume gaps, comparing skills against job description criteria, conducting interactive mock interviews, and flagging structural ATS issues.
* **Target Audience**: Job seekers, students, and engineers prepping for technical roles. It translates a static CV into an actionable training simulator.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload CV / Resume ] ──► [ Decoded Text ] ──► [ ATS Scan / Seniority Classifier ] ──► [ Sectional Meta Index ]
                                                                                               │
                                                                                               ▼
                                                                                    [ Target JD Comparisons ]
```

### Step 1: Ingestion & ATS Structural Check
* During file upload, a statistical scan is run on the raw text structure:
  * **Header Check**: Searches for common sectional headers (e.g. *Education, Experience, Skills*).
  * **Layout Check**: Scans for complex tables, columns, or text-boxes that might not parse linearly.
  * **Encoding Check**: Scans for non-standard fonts or encoding errors.
  * **Contact Details**: Checks for machine-readable phone numbers and emails.
* This returns an **ATS Structure Score** out of 100 with a pass/fail checklist displayed under the resume card.

### Step 2: Seniority Tier Classification
* The parser scans the CV text to estimate candidate seniority (e.g., matching years of experience or titles like *Senior, Lead, Principal*).
* Returns a classified tier: `NEW_GRAD`, `MID`, `SENIOR`, or `STAFF`.

---

## 3. Matching & Search Strategy (The "What")

* **Weighted Gap Analysis**: Cross-references the resume's skills list against pasted Job Descriptions (JD). Gaps are weighted by severity:
  * `CRITICAL`: A required skill in the JD that is completely missing from the resume.
  * `MINOR`: A preferred/nice-to-have skill in the JD that is absent.
* **Seniority-Scaled Interviewer Persona**: The backend dynamically scales interviewer rigor and question depth:
  * `NEW_GRAD`: Focuses on fundamentals and coding basics. Friendly and supportive.
  * `SENIOR` / `STAFF`: Questions architectural decisions, cross-team strategies, and system designs aggressively.
* **STAR Assessor & Suggestion Rewrites**: Evaluates chat answers against the **Situation, Task, Action, Result** (STAR) methodology. If a section is weak, the model generates a rewritten, metrics-backed suggestion draft.
* **Resume Consistency Checks**: Cross-references candidate responses in chat against CV database facts. If a candidate inflates a claim (e.g., claiming complete design ownership when the CV says "assisted"), a **Consistency Alert** warning is triggered.
* **Filler Word Hedging Scan**: Scans replies for filler words (e.g. *just, like, basically, I think*) to calculate a deterministic `confidence_ratio` score.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Interview Board)
* **Left Sidebar (CV Profile Summary)**: Displays the active resume details, the parsed **Seniority Tier Badge**, the **ATS Structure Score**, and historical mock rounds lists.
* **Middle Chat Feed**: The mock roleplay simulation feed where the AI acts as an interviewer and parses candidate replies.
* **Right Pane (Forensic Utilities)**:
  * **CV Gap Analyzer**: Interactive list showing Strengths, Gaps (labeled `CRITICAL` or `MINOR` with explanations), and Imprecise Claims against JDs.
  * **STAR Assessor Panel**: Logs checklist results for each mock answer, appending suggested rewrites.
  * **Consistency Alerts**: Displays alerts when interview replies contradict resume listings.
  * **Competencies Trend Graph**: Draws an SVG line chart mapping Communication, Technical, STAR, and Confidence scores across mock rounds.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B at temperature `0.3`.
* **System Prompt**: Scaled dynamically by the seniority tier, enforcing STAR scoring prompts and structured JSON returns.
