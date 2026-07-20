import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import ContractAuditorSideBar from './ContractAuditorSideBar';
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

function ContractAuditorWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

  // Compliance analysis states
  const [complianceScore, setComplianceScore] = useState(78);
  const [vulnerabilities, setVulnerabilities] = useState([
    { id: 1, label: "Indemnity Cap Missing", type: "CRITICAL", page: 1, text: "Section 4.1 contains unlimited indemnification on intellectual property infringements.", suggested_redline: "Cap total liability under the agreement at 12 months' fees paid.", market_benchmark: "Your cap: None/Uncapped. Market standard: 1x to 2x annual contract value.", confidence: "VERIFIED" },
    { id: 2, label: "Notice period too short", type: "AMBIGUOUS", page: 2, text: "Section 7.3 specifies only a 10-day notice window for material breach terminations.", suggested_redline: "Extend cure and termination notice periods to a standard 30 days.", market_benchmark: "Your notice: 10 days. Market standard: 30-60 days cure period.", confidence: "VERIFIED" },
    { id: 3, label: "Unilateral modifications allowed", type: "WARNING", page: 3, text: "Section 12.2 permits the service provider to amend compliance rules unilaterally with notice.", suggested_redline: "Require written mutual amendment signed by authorized representatives.", market_benchmark: "Your provision: Unilateral provider updates. Market standard: Bilateral consent.", confidence: "INFERRED" }
  ]);

  const [obligations, setObligations] = useState([
    { date: "Oct 12, 2026", event: "Renewal Notification Deadline", status: "PENDING" },
    { date: "Jan 15, 2027", event: "Initial Service Window Termination", status: "ALERT" },
    { date: "May 30, 2027", event: "SLA Metric Audit Window", status: "COMPLETED" }
  ]);

  const [conflicts, setConflicts] = useState([
    { title: "Notice vs. Auto-Renewal Exit Window", clauses: ["Section 7.3", "Section 12.1"], description: "The agreement requires 60 days' notice for non-renewal, but Section 7.3 allows termination on 10 days' notice for any convenience, creating commercial ambiguity.", confidence: "VERIFIED" }
  ]);

  const [radarScores, setRadarScores] = useState({
    "Financial Exposure": { score: 75, clauses: ["Section 4.1: Indemnity is uncapped (weight 70%)", "Section 5.2: Late payment penalty is 1.5%/month (weight 30%)"] },
    "IP/Liability": { score: 65, clauses: ["Section 12.2: Broad background IP transfer without exclusions (weight 100%)"] },
    "Termination & Exit Risk": { score: 80, clauses: ["Section 7.3: Notice period for exit is 10 days (weight 100%)"] },
    "Operational Risk": { score: 90, clauses: ["Section 9.1: No operational SLA exclusions for force majeure (weight 100%)"] }
  });

  const [isRadarExpanded, setIsRadarExpanded] = useState(false);
  const [selectedRadarAxis, setSelectedRadarAxis] = useState("Financial Exposure");

  const radius = 60;
  const center = 100;
  const getCoords = (score, idx) => {
    const value = (score / 100) * radius;
    if (idx === 0) return { x: center, y: center - value };
    if (idx === 1) return { x: center + value, y: center };
    if (idx === 2) return { x: center, y: center + value };
    if (idx === 3) return { x: center - value, y: center };
    return { x: center, y: center };
  };

  const currentChat = chats.find(c => c.chat_id === chatId);
  const isProcessing = currentChat?.status === "processing";
  const isFailed = currentChat?.status === "failed";

  useEffect(() => {
    setError(null);
    setSelectedCitation(null);
    setContextChip(null);
    
    // Sync analysis results if cached
    if (chatId && chats.length > 0) {
      const activeChat = chats.find(c => c.chat_id === chatId);
      if (activeChat && activeChat.analysis_results_json) {
        try {
          const parsed = JSON.parse(activeChat.analysis_results_json);
          if (parsed.compliance_score !== undefined) setComplianceScore(parsed.compliance_score);
          if (parsed.vulnerabilities) setVulnerabilities(parsed.vulnerabilities);
          if (parsed.obligations) setObligations(parsed.obligations);
          if (parsed.conflicts) setConflicts(parsed.conflicts || []);
          if (parsed.radar_scores) setRadarScores(parsed.radar_scores);
        } catch (e) {
          console.error("Failed to parse analysis results:", e);
        }
      }
    }
  }, [chatId, chats]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE}/upload?workspace_type=contract-auditor`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Parse failed.");

      setChatId(data.chat_id);
      setMessages([]);
      setChats(prev => [{ chat_id: data.chat_id, title: data.title, status: data.status, workspace_type: "contract-auditor" }, ...prev]);
    } catch (err) {
      setError(err.message || "Parse failed.");
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
          workspace_type: "audit"
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

      // Update compliance state metrics dynamically if returned by backend
      if (data.compliance_score !== undefined && data.compliance_score !== null) {
        setComplianceScore(data.compliance_score);
      } else if (questionToSend.toLowerCase().includes("risk") || questionToSend.toLowerCase().includes("indemnity")) {
        setComplianceScore(prev => Math.max(prev - 8, 45));
      }
      if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        setVulnerabilities(data.vulnerabilities);
      }
      if (data.obligations && data.obligations.length > 0) {
        setObligations(data.obligations);
      }
      if (data.conflicts) {
        setConflicts(data.conflicts);
      }
      if (data.radar_scores) {
        setRadarScores(data.radar_scores);
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

  const copyRedlinesToClipboard = () => {
    const text = vulnerabilities.map(v => `[Page ${v.page}] ${v.label}: ${v.text}`).join("\n\n");
    navigator.clipboard.writeText(text);
    alert("Redline comments copied to clipboard!");
  };

  return (
    <div className="h-full bg-[#0A0A0A] text-[#E8E8E8] flex overflow-hidden font-body font-mono text-xs select-text">
      
      {/* Left Sidebar locked to workspace */}
      <ContractAuditorSideBar
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
        onNavigateHome={onNavigateHome}
        onDrop={onDrop}
        onSelectClause={(page, label) => {
          setQuestion(`Auditor evaluation: investigate ${label} risk on page ${page}`);
        }}
        onSelectMissingClause={(clause) => {
          setQuestion(`Why is the protective clause "${clause}" absent from this agreement, and what is the risk?`);
        }}
      />

      {/* Center Q&A Board */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070707] border-r border-[#222]">
        {chatId && (
          <div className="h-16 border-b border-[#222] px-6 flex items-center justify-between bg-[#0E0E0E] shrink-0 select-none">
            <span className="font-semibold text-red-500 uppercase tracking-widest text-[10px]">
              🔍 AUDITOR DESK // {currentChat?.title}
            </span>
            <button onClick={onNavigateHome} className="text-[10px] text-zinc-500 hover:text-white uppercase transition">Exit Audit</button>
          </div>
        )}

        <div className="flex-1 w-full px-6 py-6 flex flex-col overflow-hidden max-w-2xl mx-auto justify-center">
          {!chatId && (
            <UploadZone uploading={uploading} getInputProps={getInputProps} getRootProps={getRootProps} />
          )}

          {chatId && (
            <>
              {/* Risk Vulnerabilities Tracker */}
              <div className="grid grid-cols-3 gap-3 mb-4 shrink-0 select-none">
                {vulnerabilities.map(v => (
                  <div 
                    key={v.id}
                    onClick={() => setQuestion(`Auditor evaluation: investigate ${v.label} risk on page ${v.page}`)}
                    className="p-3 bg-[#121212] border border-[#222] hover:border-red-500/30 rounded-lg cursor-pointer transition text-left"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[8px] font-bold text-[#888]">PAGE {v.page}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        v.type === "CRITICAL" ? "bg-red-950 text-red-400 border border-red-500/20" : "bg-yellow-950 text-yellow-400 border border-yellow-500/20"
                      }`}>{v.type}</span>
                    </div>
                    <p className="font-mono font-bold text-white text-[10px] truncate">{v.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex-grow overflow-y-auto mb-4" style={{ scrollbarWidth: 'thin' }}>
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
                  className="bg-[#0E0E0E] border border-[#222] rounded-lg p-2.5 flex items-center gap-3 focus-within:border-red-500/30"
                >
                  {contextChip && (
                    <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-[9px] font-bold px-3 py-1.5 rounded shrink-0 select-none">
                      <span>[AUDIT FOCUS: p.{contextChip.page}]</span>
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
                    placeholder="Enter compliance check..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-700 outline-none min-w-0 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={!question.trim() || chatLoading || isProcessing}
                    className="bg-red-950 border border-red-500/30 hover:bg-red-900 text-red-400 px-5 py-2 rounded text-xs font-bold cursor-pointer shrink-0 uppercase tracking-wider"
                  >
                    Audit
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Right Utility Pane: Severity gauge, obligations, redline log */}
      {chatId && (
        <div className="w-[300px] bg-[#0E0E0E] border-l border-[#222] flex flex-col h-full overflow-hidden shrink-0 select-none">
          <div 
            onClick={() => setIsRadarExpanded(true)}
            className="p-4 border-b border-[#222] bg-[#121212] flex flex-col gap-1.5 text-center cursor-pointer hover:bg-[#161616] transition relative group"
          >
            <span className="font-bold text-[#888] tracking-widest text-[9px] group-hover:text-white transition flex items-center justify-center gap-1">
              <span>COMPLIANCE SCORE (CLICK)</span>
              <InfoTooltip text="Overall contract compliance score (0-100). Higher is safer. Click to view detailed 4-axis risk distribution." />
            </span>
            <div className="flex justify-center items-baseline gap-1 py-1">
              <span className={`text-3xl font-bold ${complianceScore > 70 ? 'text-green-500' : 'text-red-500'}`}>{complianceScore}</span>
              <span className="text-[10px] text-[#888]">/100</span>
            </div>
            <p className="text-[8px] text-red-500/80 font-bold uppercase leading-normal px-2 py-0.5 bg-red-950/20 border border-red-500/20 rounded">
              ⚠️ Click to view 4-Axis Risk Radar
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Obligation deadlines timeline */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-bold text-[#888] tracking-widest uppercase flex items-center gap-1">
                <span>OBLIGATION TIMELINE</span>
                <InfoTooltip text="Key contract dates, notice requirements, and renewal deadlines extracted from the text." />
              </h4>
              <div className="space-y-2.5 border-l border-[#222] pl-3.5 ml-2.5">
                {obligations.map((o, idx) => (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full border ${
                      o.status === "ALERT" ? "bg-red-500 border-red-500" : o.status === "PENDING" ? "bg-yellow-500 border-yellow-500" : "bg-[#222] border-[#222]"
                    }`} />
                    <div className="text-left font-mono">
                      <p className="text-[9px] text-[#888]">{o.date}</p>
                      <p className="text-[10px] text-white font-bold truncate">{o.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contradiction Log */}
            {conflicts.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#222]">
                <h4 className="text-[9px] font-bold text-[#FFB04C] tracking-widest uppercase flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>CLAUSE CONFLICTS</span>
                  <InfoTooltip text="Identifies clauses that contradict each other (e.g. Net-30 vs. Net-60 payment terms) creating potential legal disputes." />
                </h4>
                <div className="space-y-2">
                  {conflicts.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-yellow-950/10 border border-yellow-500/20 rounded text-left font-mono text-[9px] leading-relaxed text-zinc-400">
                      <div className="flex justify-between text-yellow-400 font-bold mb-1">
                        <span>{c.title}</span>
                        {c.confidence && (
                          <span className="text-[8px] px-1 bg-yellow-950 border border-yellow-500/30 rounded">NLI: {c.confidence}</span>
                        )}
                      </div>
                      <p className="text-zinc-300 font-bold mb-1">Affected: {c.clauses.join(", ")}</p>
                      <p className="italic font-sans text-zinc-400">"{c.description}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redline list & export */}
            <div className="space-y-3 pt-3 border-t border-[#222]">
              <div className="flex justify-between items-center">
                <h4 className="text-[9px] font-bold text-[#888] tracking-widest uppercase flex items-center gap-1">
                  <span>REDLINE RECOMMENDATIONS</span>
                  <InfoTooltip text="Suggests legal drafts to replace risky terms and match market standard terms." />
                </h4>
                <button 
                  onClick={copyRedlinesToClipboard}
                  className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                >
                  Export Log
                </button>
              </div>
              <div className="space-y-3">
                {vulnerabilities.map(v => (
                  <div key={v.id} className="p-2.5 bg-[#050505] border border-[#222] rounded text-left font-mono text-[9px] leading-relaxed text-zinc-400 flex flex-col gap-2">
                    <div className="flex justify-between text-[#888] font-bold">
                      <span>CLAUSE {v.id} // PAGE {v.page}</span>
                      {v.confidence && (
                        <span className={`text-[8px] px-1 rounded border ${
                          v.confidence === "VERIFIED" ? "bg-green-950/30 text-green-400 border-green-500/20" : "bg-blue-950/30 text-blue-400 border-blue-500/20"
                        }`}>{v.confidence}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[8px] text-[#888] uppercase font-bold">Original Clause:</p>
                      <p className="text-zinc-300 italic">"{v.text}"</p>
                    </div>
                    {v.suggested_redline && (
                      <div className="pt-1.5 border-t border-[#222]">
                        <p className="text-[8px] text-red-400 uppercase font-bold">Suggested Redline:</p>
                        <p className="text-zinc-200 font-sans font-bold">→ {v.suggested_redline}</p>
                      </div>
                    )}
                    {v.market_benchmark && (
                      <div className="pt-1 border-t border-[#222]">
                        <p className="text-[8px] text-[#888] uppercase font-bold">Market Benchmark:</p>
                        <p className="text-zinc-400 font-sans text-[8px]">{v.market_benchmark}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Radar Expansion Modal */}
      {isRadarExpanded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in font-mono">
          <div className="bg-[#0E0E0E] border border-[#222] w-full max-w-xl rounded-xl p-6 shadow-2xl flex flex-col gap-5 relative text-left select-none">
            <button 
              onClick={() => setIsRadarExpanded(false)}
              className="absolute right-4 top-4 text-xs text-zinc-500 hover:text-white transition cursor-pointer"
            >
              ✕ Close
            </button>
            <h3 className="font-bold text-white uppercase text-[12px] border-b border-[#222] pb-3 tracking-wider">
              🛡️ Risk Exposure Radar Breakdown
            </h3>
            
            <div className="grid grid-cols-2 gap-6 items-center">
              {/* Radar Chart Column */}
              <div className="flex justify-center select-none">
                <svg width="220" height="220" className="overflow-visible">
                  {/* Axis lines */}
                  <line x1="100" y1="40" x2="100" y2="160" stroke="#333" strokeDasharray="2" />
                  <line x1="40" y1="100" x2="160" y2="100" stroke="#333" strokeDasharray="2" />
                  
                  {/* Grid Rings */}
                  {[25, 50, 75, 100].map((val, idx) => {
                    const radiusVal = (val / 100) * 60;
                    return (
                      <polygon
                        key={idx}
                        points={`100,${100 - radiusVal} ${100 + radiusVal},100 100,${100 + radiusVal} ${100 - radiusVal},100`}
                        fill="none"
                        stroke="#222"
                        strokeWidth="1"
                      />
                    );
                  })}
                  
                  {/* Radar Polygon */}
                  <polygon
                    points={`
                      ${getCoords(radarScores["Financial Exposure"]?.score || 100, 0).x},${getCoords(radarScores["Financial Exposure"]?.score || 100, 0).y}
                      ${getCoords(radarScores["IP/Liability"]?.score || 100, 1).x},${getCoords(radarScores["IP/Liability"]?.score || 100, 1).y}
                      ${getCoords(radarScores["Termination & Exit Risk"]?.score || 100, 2).x},${getCoords(radarScores["Termination & Exit Risk"]?.score || 100, 2).y}
                      ${getCoords(radarScores["Operational Risk"]?.score || 100, 3).x},${getCoords(radarScores["Operational Risk"]?.score || 100, 3).y}
                    `}
                    fill="rgba(239, 68, 68, 0.25)"
                    stroke="rgb(239, 68, 68)"
                    strokeWidth="2"
                  />
                  
                  {/* Radar points */}
                  {[
                    { axis: "Financial Exposure", idx: 0 },
                    { axis: "IP/Liability", idx: 1 },
                    { axis: "Termination & Exit Risk", idx: 2 },
                    { axis: "Operational Risk", idx: 3 }
                  ].map((axisObj) => {
                    const score = radarScores[axisObj.axis]?.score || 100;
                    const coords = getCoords(score, axisObj.idx);
                    return (
                      <circle
                        key={axisObj.idx}
                        cx={coords.x}
                        cy={coords.y}
                        r="3.5"
                        fill="rgb(239, 68, 68)"
                        className="cursor-pointer"
                        onClick={() => setSelectedRadarAxis(axisObj.axis)}
                      />
                    );
                  })}

                  {/* Axis labels */}
                  <text 
                    x="100" y="30" textAnchor="middle" fill={selectedRadarAxis === "Financial Exposure" ? "rgb(239, 68, 68)" : "#888"} 
                    className="text-[8px] font-bold cursor-pointer transition uppercase" onClick={() => setSelectedRadarAxis("Financial Exposure")}
                  >
                    FINANCIAL ({radarScores["Financial Exposure"]?.score || 100})
                  </text>
                  <text 
                    x="165" y="103" textAnchor="start" fill={selectedRadarAxis === "IP/Liability" ? "rgb(239, 68, 68)" : "#888"} 
                    className="text-[8px] font-bold cursor-pointer transition uppercase" onClick={() => setSelectedRadarAxis("IP/Liability")}
                  >
                    IP ({radarScores["IP/Liability"]?.score || 100})
                  </text>
                  <text 
                    x="100" y="178" textAnchor="middle" fill={selectedRadarAxis === "Termination & Exit Risk" ? "rgb(239, 68, 68)" : "#888"} 
                    className="text-[8px] font-bold cursor-pointer transition uppercase" onClick={() => setSelectedRadarAxis("Termination & Exit Risk")}
                  >
                    EXIT ({radarScores["Termination & Exit Risk"]?.score || 100})
                  </text>
                  <text 
                    x="35" y="103" textAnchor="end" fill={selectedRadarAxis === "Operational Risk" ? "rgb(239, 68, 68)" : "#888"} 
                    className="text-[8px] font-bold cursor-pointer transition uppercase" onClick={() => setSelectedRadarAxis("Operational Risk")}
                  >
                    OP ({radarScores["Operational Risk"]?.score || 100})
                  </text>
                </svg>
              </div>
              
              {/* Contributing Clauses Column */}
              <div className="flex flex-col gap-3 min-w-0">
                <span className="text-[10px] text-[#888] tracking-wider uppercase font-bold">
                  AXIS: <span className="text-red-400">{selectedRadarAxis}</span>
                </span>
                <div className="bg-[#050505] border border-[#222] rounded p-3 text-[10px] leading-relaxed text-zinc-400 flex-1 overflow-y-auto max-h-[160px]" style={{ scrollbarWidth: 'thin' }}>
                  {radarScores[selectedRadarAxis]?.clauses && radarScores[selectedRadarAxis].clauses.length > 0 ? (
                    <ul className="list-disc pl-3 space-y-1.5">
                      {radarScores[selectedRadarAxis].clauses.map((clause, idx) => (
                        <li key={idx} className="font-mono text-[9px]">{clause}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="italic text-zinc-600 text-[9px]">No significant risk factors flagged on this axis.</p>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {selectedCitation && (
        <div className="absolute right-0 top-0 h-full w-[320px] bg-[#0E0E0E] border-l border-[#222] shadow-2xl z-30 p-6 flex flex-col gap-4 animate-fade-in text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <h4 className="font-bold text-white uppercase text-[10px]">Reference Segment</h4>
            <button onClick={() => setSelectedCitation(null)} className="text-[10px] text-[#888] hover:text-white uppercase transition cursor-pointer">✕ Close</button>
          </div>
          
          <div className="flex justify-between items-center bg-[#050505] border border-[#222] p-3 rounded-lg select-none">
            <span className="text-[9px] text-[#888]">PAGE NODE</span>
            <span className="text-[9px] bg-red-950/40 border border-red-500/30 text-red-500 px-2 py-0.5 rounded font-bold">p.{selectedCitation.page}</span>
          </div>

          <div className="flex-1 overflow-y-auto text-[10px] leading-relaxed text-zinc-400 bg-[#050505] border border-[#222] p-4 rounded-lg italic">
            "{selectedCitation.text}"
          </div>
        </div>
      )}

    </div>
  );
}

export default ContractAuditorWorkspace;
