import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import SpreadsheetAnalyticsSideBar from './SpreadsheetAnalyticsSideBar';
import API_BASE from '../../api';

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative group inline-block ml-1 select-none font-sans font-normal normal-case">
      <span 
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-[8px] bg-[#2A2A2A] hover:bg-[#3ECF8E] text-[#8A8A8A] hover:text-black w-3.5 h-3.5 inline-flex items-center justify-center rounded-full cursor-help font-bold transition-colors"
      >
        i
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-[#0D0E10] border border-[#2A2A2A] text-zinc-300 text-[8px] font-sans rounded-md p-2 shadow-xl z-50 leading-normal normal-case pointer-events-none text-left">
          {text}
        </span>
      )}
    </span>
  );
}

function SpreadsheetAnalyticsWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

  // Parameter sliders for mathematical concepts simulation
  // Dynamic variable parameters from uploaded spreadsheet columns
  const [variables, setVariables] = useState([
    { name: "Unit Price", min: 10, max: 200, value: 85.0, mean: 85.0 },
    { name: "Conversion Rate", min: 0.01, max: 0.15, value: 0.035, mean: 0.035 },
    { name: "Headcount", min: 5, max: 80, value: 25.0, mean: 25.0 }
  ]);
  const [outliers, setOutliers] = useState([]);
  const [forecast, setForecast] = useState({});
  const [tornadoChart, setTornadoChart] = useState([
    { name: "Unit Price", min_outcome: 80000, max_outcome: 180000, swing: 100000 },
    { name: "Conversion Rate", min_outcome: 90000, max_outcome: 150000, swing: 60000 },
    { name: "Headcount", min_outcome: 110000, max_outcome: 130000, swing: 20000 }
  ]);
  const [outcomeMetric, setOutcomeMetric] = useState(120000.0);
  const [monteCarloDistribution, setMonteCarloDistribution] = useState([]);
  
  // Waveform canvas rendering mode
  const [canvasMode, setCanvasMode] = useState("manual"); // "manual" | "forecast" | "monte_carlo"

  // Deepened utility variables
  const [pinnedScenarios, setPinnedScenarios] = useState([
    { id: 1, name: "Baseline Scenario", outcome: 120000, variables: [{ name: "Unit Price", value: 85.0 }, { name: "Conversion Rate", value: 0.035 }, { name: "Headcount", value: 25.0 }] },
    { id: 2, name: "Optimistic Swing", outcome: 154000, variables: [{ name: "Unit Price", value: 110.0 }, { name: "Conversion Rate", value: 0.045 }, { name: "Headcount", value: 25.0 }] }
  ]);
  const [assumptionLog, setAssumptionLog] = useState([
    { time: "17:34", event: "Variable Unit Price tweaked: 85.0 → 110.0" }
  ]);

  const canvasRef = useRef(null);

  const currentChat = chats.find(c => c.chat_id === chatId);
  const isProcessing = currentChat?.status === "processing";
  const isFailed = currentChat?.status === "failed";

  // Equations and calculations computed dynamically
  const compareSnapshots = (snap1, snap2) => {
    if (!snap1 || !snap2) return null;
    let maxDiff = 0;
    let maxDiffVar = "";
    snap1.variables.forEach(v1 => {
      const v2 = snap2.variables.find(x => x.name === v1.name);
      if (v2) {
        const diff = Math.abs((v1.value !== undefined ? v1.value : v1.mean) - (v2.value !== undefined ? v2.value : v2.mean));
        if (diff > maxDiff) {
          maxDiff = diff;
          maxDiffVar = v1.name;
        }
      }
    });
    return {
      variable: maxDiffVar,
      difference: maxDiff,
      outcomeDiff: Math.abs(snap1.outcome - snap2.outcome)
    };
  };

  useEffect(() => {
    setError(null);
    setSelectedCitation(null);
    setContextChip(null);
    if (chatId && chats.length > 0) {
      const activeChat = chats.find(c => c.chat_id === chatId);
      if (activeChat && activeChat.analysis_results_json) {
        try {
          const parsed = JSON.parse(activeChat.analysis_results_json);
          if (parsed.variables) setVariables(parsed.variables);
          if (parsed.outliers) setOutliers(parsed.outliers);
          if (parsed.forecast) setForecast(parsed.forecast);
          if (parsed.tornado_chart) setTornadoChart(parsed.tornado_chart);
          if (parsed.outcome_metric !== undefined) setOutcomeMetric(parsed.outcome_metric);
          if (parsed.monte_carlo_distribution) setMonteCarloDistribution(parsed.monte_carlo_distribution);
          if (parsed.assumption_log) setAssumptionLog(parsed.assumption_log);
        } catch (e) {
          console.error("Failed to parse sheet analytics metrics:", e);
        }
      }
    }
  }, [chatId, chats]);

  // Renders interactive graphical canvas based on sliders parameters and canvasMode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth;
    const height = canvas.height = canvas.clientHeight;

    ctx.fillStyle = '#0D0E10';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    if (canvasMode === "manual" || !forecast.historical_points) {
      // Manual Waveform Plot
      ctx.strokeStyle = '#3ECF8E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const waveFreq = variables.length > 0 ? (variables[0].value || variables[0].mean) : 1;
      const waveAmp = variables.length > 1 ? (variables[1].value || variables[1].mean) : 10;
      
      for (let x = 0; x < width; x++) {
        const scaleX = x / width;
        const y = height / 2 - Math.sin(scaleX * Math.PI * 4 * (waveFreq / 100 || 1)) * waveAmp * 0.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      ctx.fillStyle = '#9A9A9A';
      ctx.font = '9px "Inter", sans-serif';
      ctx.fillText("SIMULATION PLOT WAVEFORM (MANUAL MODE)", 15, 20);
      ctx.fillText(`Base outcome: ${outcomeMetric.toFixed(2)}`, 15, height - 15);
      
    } else if (canvasMode === "forecast" && forecast.historical_points) {
      // Forecast Plot (historical points + trend line)
      const hist = forecast.historical_points;
      const fut = forecast.future_points || [];
      const allPoints = [...hist, ...fut];
      const xVals = allPoints.map(p => p.x);
      const yVals = allPoints.map(p => p.y);
      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const minY = Math.min(...yVals);
      const maxY = Math.max(...yVals);
      
      const mapX = (x) => 30 + ((x - minX) / (maxX - minX || 1)) * (width - 60);
      const mapY = (y) => height - 30 - ((y - minY) / (maxY - minY || 1)) * (height - 60);
      
      // Draw historical points as dots
      ctx.fillStyle = '#4C8DFF';
      hist.forEach(p => {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw future trend projection line
      if (fut.length > 0) {
        ctx.strokeStyle = '#3ECF8E';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mapX(hist[hist.length - 1].x), mapY(hist[hist.length - 1].y));
        fut.forEach(p => {
          ctx.lineTo(mapX(p.x), mapY(p.y));
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw future points as diamonds
        ctx.fillStyle = '#3ECF8E';
        fut.forEach(p => {
          ctx.beginPath();
          const cx = mapX(p.x);
          const cy = mapY(p.y);
          ctx.moveTo(cx, cy - 3.5);
          ctx.lineTo(cx + 3.5, cy);
          ctx.lineTo(cx, cy + 3.5);
          ctx.lineTo(cx - 3.5, cy);
          ctx.closePath();
          ctx.fill();
        });
      }
      
      ctx.fillStyle = '#9A9A9A';
      ctx.font = '9px "Inter", sans-serif';
      ctx.fillText("LINEAR TREND FORECAST (HISTORICALS + PROJECTIONS)", 15, 20);
      
    } else if (canvasMode === "monte_carlo" && monteCarloDistribution.length > 0) {
      // Monte Carlo Distribution Histogram
      const dist = monteCarloDistribution;
      const bins = 15;
      const minVal = Math.min(...dist);
      const maxVal = Math.max(...dist);
      const range = maxVal - minVal || 1;
      const binCounts = Array(bins).fill(0);
      
      dist.forEach(v => {
        const binIdx = Math.min(bins - 1, Math.floor(((v - minVal) / range) * bins));
        binCounts[binIdx] += 1;
      });
      
      const maxCount = Math.max(...binCounts) || 1;
      const binWidth = (width - 60) / bins;
      
      ctx.fillStyle = 'rgba(62, 207, 142, 0.45)';
      ctx.strokeStyle = '#3ECF8E';
      ctx.lineWidth = 1.5;
      
      for (let i = 0; i < bins; i++) {
        const binHeight = (binCounts[i] / maxCount) * (height - 60);
        const x = 30 + i * binWidth;
        const y = height - 30 - binHeight;
        ctx.fillRect(x, y, binWidth - 2, binHeight);
        ctx.strokeRect(x, y, binWidth - 2, binHeight);
      }
      
      ctx.fillStyle = '#9A9A9A';
      ctx.font = '9px "Inter", sans-serif';
      ctx.fillText("MONTE CARLO PROBABILITY DISTRIBUTION", 15, 20);
      ctx.fillText(`Min: ${minVal.toFixed(2)}`, 15, height - 15);
      ctx.fillText(`Max: ${maxVal.toFixed(2)}`, width - 120, height - 15);
    }
  }, [variables, canvasMode, forecast, monteCarloDistribution, outcomeMetric]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE}/upload?workspace_type=spreadsheet-analytics`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Upload failed.");

      setChatId(data.chat_id);
      setMessages([]);
      setChats(prev => [{ chat_id: data.chat_id, title: data.title, status: data.status, workspace_type: "spreadsheet-analytics" }, ...prev]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "text/plain": [".txt", ".md"]
    }
  });

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim() || chatLoading || isProcessing) return;

    const questionToSend = question.trim();
    setQuestion("");
    setChatLoading(true);

    const pageFilter = contextChip ? contextChip.page : null;
    setContextChip(null);

    try {
      setMessages(prev => [...prev, { role: "user", content: questionToSend }]);

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: questionToSend,
          page: pageFilter,
          workspace_type: "insight"
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        token_count: data.token_count,
        citations: data.citations
      }]);

      // Update quantitative state metrics dynamically if returned by backend
      if (data.variables && data.variables.length > 0) {
        setVariables(data.variables);
      }
      if (data.outliers) {
        setOutliers(data.outliers);
      }
      if (data.forecast) {
        setForecast(data.forecast);
      }
      if (data.tornado_chart && data.tornado_chart.length > 0) {
        setTornadoChart(data.tornado_chart);
      }
      if (data.outcome_metric !== undefined) {
        setOutcomeMetric(data.outcome_metric);
      }
      if (data.monte_carlo_distribution && data.monte_carlo_distribution.length > 0) {
        setMonteCarloDistribution(data.monte_carlo_distribution);
      }
      if (data.assumption_log && data.assumption_log.length > 0) {
        setAssumptionLog(data.assumption_log);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.page) setContextChip(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVariableChange = async (name, value) => {
    setVariables(prev => prev.map(v => v.name === name ? { ...v, value } : v));
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: `/tweak ${JSON.stringify({ name, value })}`,
          workspace_type: "insight"
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.variables) setVariables(data.variables);
        if (data.tornado_chart) setTornadoChart(data.tornado_chart);
        if (data.outcome_metric !== undefined) setOutcomeMetric(data.outcome_metric);
        if (data.monte_carlo_distribution) setMonteCarloDistribution(data.monte_carlo_distribution);
        if (data.assumption_log) setAssumptionLog(data.assumption_log);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pinCurrentScenario = () => {
    const name = prompt("Enter Scenario Name:", `Scenario ${pinnedScenarios.length + 1}`);
    if (name) {
      setPinnedScenarios(prev => [
        ...prev,
        { id: Date.now(), name, outcome: outcomeMetric, variables: [...variables] }
      ]);
    }
  };

  return (
    <div className="h-full bg-[#141517] text-[#E3E3E3] flex overflow-hidden font-sans select-text">
      
      {/* Parameter Control Panel (Left Pane Sidebar) */}
      <SpreadsheetAnalyticsSideBar
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
        onNavigateHome={onNavigateHome}
        onDrop={onDrop}
        variables={variables}
        onVariableChange={handleVariableChange}
        outcomeMetric={outcomeMetric}
      />

      {/* Center Graph Canvas & Q&A */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0D0E10] border-r border-[#2A2A2A]">
        {chatId && (
          <div className="h-16 border-b border-[#2A2A2A] px-6 flex items-center justify-between bg-[#1A1B1F] shrink-0 select-none">
            <span className="font-semibold text-[#3ECF8E] text-xs font-mono tracking-wider">
              📊 DATA SIMULATOR // {currentChat?.title}
            </span>
            <button onClick={onNavigateHome} className="text-xs text-[#9A9A9A] hover:text-white transition cursor-pointer">Close Lab</button>
          </div>
        )}

        <div className="flex-1 w-full px-6 py-6 flex flex-col overflow-hidden max-w-2xl mx-auto justify-center">
          {!chatId && (
            <UploadZone uploading={uploading} getInputProps={getInputProps} getRootProps={getRootProps} />
          )}

          {chatId && (
            <>
              {/* Canvas Modes / Controls */}
              <div className="flex gap-2 mb-3.5 select-none font-mono text-[9px] font-bold items-center">
                {["manual", "forecast", "monte_carlo"].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => setCanvasMode(mode)}
                    className={`px-3 py-1.5 rounded-lg border uppercase transition cursor-pointer ${
                      canvasMode === mode 
                        ? "bg-[#3ECF8E] border-[#3ECF8E] text-black" 
                        : "bg-[#1A1B1F] border-[#2A2A2A] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode.replace("_", " ")}
                  </button>
                ))}
                <InfoTooltip text="Switch visual modes: MANUAL plots curves from variables; FORECAST fits linear trends; MONTE CARLO shows probability outcomes." />
              </div>

              {/* Graphical Waveform canvas */}
              <div className="h-40 bg-[#0A0A0B] border border-[#2A2A2A] rounded-xl overflow-hidden mb-4 shrink-0 shadow-inner relative">
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>

              {/* Chat replies */}
              <div className="flex-1 overflow-y-auto mb-4" style={{ scrollbarWidth: 'thin' }}>
                <MessageList
                  messages={messages}
                  chatLoading={chatLoading}
                  isProcessing={isProcessing}
                  isFailed={isFailed}
                  onSelectCitation={(cit) => setSelectedCitation(cit)}
                />
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <form 
                  onSubmit={handleChatSubmit}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="bg-[#1A1B1F] border border-[#2A2A2A] rounded-xl p-2.5 flex items-center gap-3 focus-within:border-[#3ECF8E]/40"
                >
                  {contextChip && (
                    <div className="flex items-center gap-1.5 bg-[#3ECF8E]/10 border border-[#3ECF8E]/25 text-[#3ECF8E] font-mono text-[9px] font-bold px-3 py-1.5 rounded-full shrink-0 select-none">
                      <span>[Scope: p.{contextChip.page}]</span>
                      <button type="button" onClick={() => setContextChip(null)} className="hover:text-red-400 cursor-pointer ml-1">✕</button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    disabled={chatLoading || isProcessing}
                    placeholder="Enter sandbox calculations request..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 outline-none min-w-0 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={!question.trim() || chatLoading || isProcessing}
                    className="bg-[#3ECF8E] hover:bg-[#4EFE9E] disabled:bg-[#1C1D1F] text-black px-5 py-2 rounded-full text-xs font-semibold cursor-pointer shrink-0 font-mono"
                  >
                    Solve
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Right Utility Pane: Scenario snapshots, logs, formulas */}
      {chatId && (
        <div className="w-[300px] bg-[#1A1B1F] border-l border-[#2A2A2A] flex flex-col h-full overflow-hidden shrink-0 select-none font-mono text-[10px]">
          <div className="p-4 border-b border-[#2A2A2A] bg-[#222327] flex justify-between items-center">
            <span className="font-bold text-[#3ECF8E] tracking-widest text-[9px] flex items-center gap-1">
              <span>SCENARIO MANAGER</span>
              <InfoTooltip text="Save and compare different slider parameter snapshots to calculate delta changes." />
            </span>
            <button 
              onClick={pinCurrentScenario}
              className="text-[9px] text-[#3ECF8E] hover:text-[#4EFE9E] font-bold uppercase cursor-pointer"
            >
              Pin Snapshot
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Scenario snapshots comparison */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-bold text-[#8A8A8A] tracking-wider uppercase flex items-center gap-1">
                <span>PINNED CONFIGS</span>
                <InfoTooltip text="Saved model snapshots. Compares the two most recent snapshots to highlight the variable that caused the largest outcome swing." />
              </h4>
              <div className="space-y-2">
                {pinnedScenarios.map(s => (
                  <div key={s.id} className="p-2.5 bg-[#0D0E10] border border-[#2A2A2A] rounded-lg text-left space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>{s.name}</span>
                      <span className="text-[#3ECF8E] font-mono">{s.outcome.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Snapshot variance comparative highlights */}
              {pinnedScenarios.length >= 2 && (() => {
                const comparison = compareSnapshots(pinnedScenarios[pinnedScenarios.length - 2], pinnedScenarios[pinnedScenarios.length - 1]);
                return comparison && (
                  <div className="bg-[#0A0A0B] border border-[#2A2A2A] p-2.5 rounded-lg text-left text-zinc-400 mt-2 font-sans text-[8px] leading-relaxed">
                    <p className="text-[#3ECF8E] font-bold">SNAPSHOT COMPARISON HIGHLIGHT:</p>
                    <p>Largest variable shift: <strong className="text-white">{comparison.variable}</strong> (shift size: {comparison.difference.toFixed(2)})</p>
                    <p>Outcome variance: <strong className="text-[#3ECF8E] font-mono">{comparison.outcomeDiff.toFixed(2)}</strong></p>
                  </div>
                );
              })()}
            </div>

            {/* Outlier Row Alerts */}
            {outliers.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#2A2A2A]">
                <h4 className="text-[9px] font-bold text-red-500 tracking-wider uppercase flex items-center gap-1">
                  <span>⚡ ROW OUTLIER ANOMALIES</span>
                  <InfoTooltip text="Identifies spreadsheet rows whose numerical values diverge by more than 2.5 standard deviations from the column average (suggesting typos or entry errors)." />
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {outliers.map((out, idx) => (
                    <div key={idx} className="p-2.5 bg-red-950/20 border border-red-500/25 rounded text-left leading-normal text-zinc-300">
                      <p className="text-red-400 font-bold mb-0.5">Row {out.row} [p.{out.page}]</p>
                      <p className="text-[9px] font-sans italic">"{out.description}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sensitivity Analysis Swing Tornado Chart */}
            {tornadoChart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#2A2A2A]">
                <h4 className="text-[9px] font-bold text-[#3ECF8E] tracking-wider uppercase flex items-center gap-1">
                  <span>SENSITIVITY ANALYSIS (TORNADO)</span>
                  <InfoTooltip text="Measures the direct swing impact on final outcomes by scaling each variable from its min to max bounds independently (holding others constant)." />
                </h4>
                <div className="space-y-2 text-left font-sans">
                  {tornadoChart.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[8px] text-zinc-400">
                        <span>{item.name}</span>
                        <span className="font-mono text-[#3ECF8E]">Swing: {item.swing.toFixed(1)}</span>
                      </div>
                      {/* Swing bar visualization */}
                      <div className="h-1.5 w-full bg-[#0D0E10] rounded overflow-hidden relative border border-[#2A2A2A]">
                        <div 
                          style={{ 
                            width: `${Math.min(100, (item.swing / (tornadoChart[0].swing || 1)) * 100)}%`,
                            marginLeft: 'auto',
                            marginRight: 'auto'
                          }} 
                          className="h-full bg-[#3ECF8E]" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assumption modification logs */}
            <div className="space-y-3 pt-3 border-t border-[#2A2A2A]">
              <h4 className="text-[9px] font-bold text-[#8A8A8A] tracking-wider uppercase">ASSUMPTION HISTORY LOG</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {assumptionLog.map((log, idx) => (
                  <div key={idx} className="flex justify-between gap-2.5 text-[#8A8A8A] text-[9px] leading-relaxed">
                    <span className="text-[#3ECF8E] shrink-0">[{log.time}]</span>
                    <span className="truncate flex-1 text-left">{log.event}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formula transparency */}
            <div className="space-y-3 pt-3 border-t border-[#2A2A2A]">
              <h4 className="text-[9px] font-bold text-[#8A8A8A] tracking-wider uppercase">FORMULA TRANSPARENCY</h4>
              <div className="bg-[#0D0E10] border border-[#2A2A2A] p-3 rounded-lg text-left text-zinc-400 space-y-2">
                <div>
                  <p className="text-[#3ECF8E] font-bold">1. Scenario Outcome Eq:</p>
                  <p className="text-[9px] bg-[#222327] p-1.5 rounded mt-0.5 text-white">Outcome = sum(Variable * weight)</p>
                </div>
                <div>
                  <p className="text-[#3ECF8E] font-bold">2. Sensitivity Variance Swing:</p>
                  <p className="text-[9px] bg-[#222327] p-1.5 rounded mt-0.5 text-white">Swing = abs(Outcome_Max - Outcome_Min)</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {selectedCitation && (
        <div className="absolute right-0 top-0 h-full w-[320px] bg-[#1A1B1F] border-l border-[#2A2A2A] shadow-2xl z-30 p-6 flex flex-col gap-4 animate-fade-in text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
            <h4 className="font-semibold text-white">Reference Parameters</h4>
            <button onClick={() => setSelectedCitation(null)} className="text-xs text-[#9A9A9A] hover:text-white transition cursor-pointer">✕ Close</button>
          </div>
          
          <div className="flex justify-between items-center bg-[#0D0E10] border border-[#2A2A2A] p-3 rounded-lg select-none">
            <span className="text-[10px] text-[#9A9A9A] font-bold">SOURCE PAGE</span>
            <span className="font-mono text-[9px] bg-[#3ECF8E]/15 border border-[#3ECF8E]/20 text-[#3ECF8E] px-2.5 py-0.5 rounded font-bold">p.{selectedCitation.page}</span>
          </div>

          <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-zinc-300 bg-[#0D0E10] border border-[#2A2A2A] p-4 rounded-xl italic">
            "{selectedCitation.text}"
          </div>
        </div>
      )}

    </div>
  );
}

export default SpreadsheetAnalyticsWorkspace;
