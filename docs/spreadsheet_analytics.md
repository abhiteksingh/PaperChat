# Docent Architecture Guide — Spreadsheet Analytics & Quantitative Sandbox

This guide explains the exact flow, RAG pipeline, and matching mechanics of the **Spreadsheet Analytics & Quantitative Sandbox**. It is designed for beginners to understand tabular data simulation modeling.

---

## 1. Core Purpose (The "Why")
* **Goal**: Enable numerical data comparisons, cost modeling, and mathematical sandbox calculations over spreadsheet files.
* **Target Audience**: Business quants, operational analysts, accountants, and engineers. It turns static data sheets into dynamic models where changing variables recalculates projections.

---

## 2. Ingestion & RAG Pipeline (The "How")

```
[ Upload Spreadsheet ] ──► [ Decoded Cell Rows ] ──► [ Line-by-Line Serializer ] ──► [ DB Row Indexes ]
                                                                                           │
                                                                                           ▼
                                                                                 [ Structured Search ]
```

### Step 1: Row-by-Row Tabular Serialization
* Standard character splitters cut text blindly, which destroys tabular rows.
* **The Solution**: The parser reads spreadsheets (`.csv`, `.xlsx`) line-by-line, creating text representations for individual rows:
  `"Row 5: Date = 2026-05-10 | Client = Alpha | Amount = $24,500"`
* This preserves the relationship between columns on each row.

### Step 2: Indexing Groups
* Row entries are grouped (30 rows per page chunk) to fit within context limits and keep page-indexing and citations cohesive.

---

## 3. Matching & Search Strategy (The "What")
* **Numeric Filters**: Searches match column keywords and filter results based on numerical criteria.
* **Formula Execution**: Math questions are processed by the Sandbox agent, which runs equations on columns data and displays exact calculations to prevent LLM arithmetic errors.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Analytics Lab)
* **Left Sidebar (Variables Control)**: Sliders to adjust coefficients (Learning Rate, Dimensions, Chunk Overlaps) that dynamically recalculate Vector Density, Accuracy, and computed token costs.
* **Middle Canvas Panel**:
  * **Interactive Waveform Canvas**: Draws dynamic math curves in real-time as sliders are moved.
  * Standard RAG chat for calculation queries.
* **Right Pane (Scenario Manager)**:
  * **Scenario Snapshots**: Allows users to "Pin" current configurations and compare 2-3 snapshots side-by-side.
  * **Assumption Log**: A timestamped log history recording slider adjustments.
  * **Formula Transparency**: Code math formulas (V_Density, Cost) displayed for auditing.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B.
* **Temperature**: `0.1` (extremely low temperature to ensure strict adherence to quantitative data limits and prevent calculation errors).
* **System Prompt**: Focuses on variable breakdowns, formula evaluations, explaining numeric relationships, and citing source rows `[p.X]`.
