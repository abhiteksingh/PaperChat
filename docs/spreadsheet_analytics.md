# Docent Architecture Guide — Spreadsheet Analytics & Quantitative Sandbox

This guide explains the flow, RAG pipeline, and quantitative matching mechanics of the **Spreadsheet Analytics & Quantitative Sandbox**. It is designed for beginners to understand tabular data simulation modeling.

---

## 1. Core Purpose (The "Why")
* **Goal**: Enable numerical data comparisons, cost modeling, sensitivity testing, forecasting, and mathematical sandbox calculations over spreadsheet files.
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
* The parser reads spreadsheets (`.csv`, `.xlsx`) line-by-line, creating text representations for individual rows (preserving the column relationships on each row).

### Step 2: Indexing Groups
* Row entries are grouped (30 rows per page chunk) to fit within context limits and keep page-indexing and citations cohesive.

### Step 3: Outlier/Anomaly Detection
* During ingestion, a statistical pass scans numerical columns to identify rows with values exceeding $2.5$ standard deviations from the mean.
* Anomalies are flagged with citations to the exact row `[p.X]` so analysts can spot typos or entry errors.

---

## 3. Matching & Search Strategy (The "What")

* **Dynamic Sliders Generation**: Instead of retrieval hyperparameters, variables controls are dynamically mapped to numeric columns detected in the dataset (e.g. headcount, growth rate, conversions).
* **Formula Execution**: Math questions are processed by the Sandbox agent, which runs equations on columns data and displays exact calculations to prevent LLM arithmetic errors.
* **Sensitivity Analysis (Tornado Swings)**:
  * Holding other factors constant, the sandbox swings each parameter independently between its min and max bounds to measure the output swing.
  * Displays variables ranked by impact in a Tornado chart.
* **Goal Seek Reverse Solves**:
  * Solve backward to calculate what value a specific input variable requires to hit a targeted outcome (e.g., ARR targets).
* **Monte Carlo Uncertainty Modeling**:
  * Defines variable ranges as distributions rather than static points, running random sample simulations to output a probability outcome histogram.
* **Trend Extrapolation & Forecasting**:
  * Fits a linear regression line ($\text{slope} \cdot x + \text{intercept}$) on historical time-series cells to project trends.

---

## 4. Frontend & Backend Interactions

### Frontend Layout (Analytics Lab)
* **Left Sidebar (Variables Control)**: Sliders dynamically generated from parsed columns.
* **Middle Canvas Panel**:
  * **Interactive Waveform Canvas**: Plots manual math waves, trend regressions, or Monte Carlo histogram bins.
  * Standard RAG chat for calculation queries.
* **Right Pane (Scenario Manager)**:
  * **Scenario Snapshots**: Pin and compare scenarios, highlighting which variable change caused the largest shift.
  * **Sensitivity Tornado Chart**: Displays ranked bars representing variance impact.
  * **Row Anomaly list**: Flags outliers.
  * **Assumption Log**: Logs value updates.

### Backend Agent Logic
* **Model**: Groq LLaMA-3.1-70B at temperature `0.1` (strict adherence to quantitative data limits).
* **System Prompt**: Focuses on variable breakdowns, formula evaluations, and citing source rows `[p.X]`.
