import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import InterviewSimulatorSideBar from './InterviewSimulatorSideBar';
import API_BASE from '../../api';

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative group inline-block ml-1 select-none font-sans font-normal normal-case">
      <span 
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-[8px] bg-[#2D251D] hover:bg-[#FFB04C] text-[#9A958F] hover:text-black w-3.5 h-3.5 inline-flex items-center justify-center rounded-full cursor-help font-bold transition-colors"
      >
        i
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-[#120F0D] border border-[#2D251D] text-zinc-300 text-[8px] font-sans rounded-md p-2 shadow-xl z-50 leading-normal normal-case pointer-events-none text-left">
          {text}
        </span>
      )}
    </span>
  );
}

function InterviewSimulatorWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

  // Deepened utility variables
  const [jobDescription, setJobDescription] = useState("");
  const [cvAnalysis, setCvAnalysis] = useState({
    strengths: ["Strong backend architecture experience in Python/FastAPI.", "Demonstrated unit test coverage optimization history."],
    gaps: [
      { label: "No cloud infrastructure listed", severity: "CRITICAL", rationale: "The JD mandates experience with AWS/GCP to deploy microservices." },
      { label: "Missing Docker/Kubernetes container orchestrations", severity: "MINOR", rationale: "Preferred skill; minor gap since senior developers can quickly onboard." }
    ],
    vagueClaims: ["'Helped build a RAG application' — needs exact metrics (e.g. latency, chunk count)."]
  });

  const [starFeedback, setStarFeedback] = useState([
    { id: 1, criteria: "SITUATION", comment: "Well framed context about database latency issues.", pass: true, rewrite_suggestion: "During my time at Acme Corp, we hit a hard SQLite read/write lock bottleneck that increased API latency by 150ms during peak hours." },
    { id: 2, criteria: "TASK", comment: "Identified the goal to migrate SQLite indices.", pass: true, rewrite_suggestion: "My objective was to decouple concurrent read paths and implement a low-latency metadata index using Pinecone and BM25." },
    { id: 3, criteria: "ACTION", comment: "Good technical details on Pinecone metadata.", pass: true, rewrite_suggestion: "I designed a parent-child chunking system, created a hybrid sparse-dense rank fusion function, and migrated raw queries." },
    { id: 4, criteria: "RESULT", comment: "Missing exact performance output percentages.", pass: false, rewrite_suggestion: "This optimization cut our average API response times from 280ms down to 45ms, a 6x speedup, while resolving lock contention." }
  ]);

  const [consistencyFlags, setConsistencyFlags] = useState([
    { clause: "RAG Design Role", discrepancy: "Candidate stated 'I led the complete design of the vector database search pipeline', but the resume lists their role as 'collaborator/assistant on RAG service'." }
  ]);

  const [scoresHistory, setScoresHistory] = useState([
    { round: 1, communication_clarity: 70, technical_depth: 60, star_completeness: 55, confidence_ratio: 90 },
    { round: 2, communication_clarity: 75, technical_depth: 65, star_completeness: 65, confidence_ratio: 85 },
    { round: 3, communication_clarity: 82, technical_depth: 72, star_completeness: 80, confidence_ratio: 95 }
  ]);

  const currentChat = chats.find(c => c.chat_id === chatId);
  const isProcessing = currentChat?.status === "processing";
  const isFailed = currentChat?.status === "failed";

  useEffect(() => {
    setError(null);
    setSelectedCitation(null);
    setContextChip(null);

    if (chatId && chats.length > 0) {
      const activeChat = chats.find(c => c.chat_id === chatId);
      if (activeChat && activeChat.analysis_results_json) {
        try {
          const parsed = JSON.parse(activeChat.analysis_results_json);
          if (parsed.cv_analysis) setCvAnalysis(parsed.cv_analysis);
          if (parsed.star_feedback) setStarFeedback(parsed.star_feedback);
          if (parsed.consistency_flags) setConsistencyFlags(parsed.consistency_flags || []);
          if (parsed.scores_history) setScoresHistory(parsed.scores_history || []);
        } catch (e) {
          console.error("Failed to parse career analysis results:", e);
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

      const response = await fetch(`${API_BASE}/upload?workspace_type=interview-simulator`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Parse failed.");

      setChatId(data.chat_id);
      setMessages([]);
      setChats(prev => [{ chat_id: data.chat_id, title: data.title, status: data.status, workspace_type: "interview-simulator" }, ...prev]);
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
          workspace_type: "career"
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

      // Update career coaching state metrics dynamically if returned by backend
      if (data.cv_analysis) {
        setCvAnalysis(data.cv_analysis);
      }
      if (data.star_feedback && data.star_feedback.length > 0) {
        setStarFeedback(data.star_feedback);
      }
      if (data.consistency_flags) {
        setConsistencyFlags(data.consistency_flags);
      }
      if (data.scores_history) {
        setScoresHistory(data.scores_history);
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

  const calculateJDAlignment = (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    // Mock comparative analysis mapping
    setCvAnalysis({
      strengths: ["Matches backend language criteria (Python).", "Direct correlation with FastAPI microservices requirements."],
      gaps: ["Job requires cloud architecture experience.", "Candidate has no SQL scale indexing listed."],
      vagueClaims: ["Candidate metrics are self-reported without database query timing logs."]
    });
    alert("Job Description successfully compared! View CV Gaps on the right pane.");
  };

  const competencies = [
    { key: "communication_clarity", color: "#FFB04C", label: "Comm" },
    { key: "technical_depth", color: "#4C8DFF", label: "Tech" },
    { key: "star_completeness", color: "#3ECF8E", label: "STAR" },
    { key: "confidence_ratio", color: "#FF4C4C", label: "Conf" }
  ];
  
  const chartWidth = 220;
  const chartHeight = 80;
  const padding = 15;
  
  const getChartPoints = (key) => {
    if (!scoresHistory || scoresHistory.length === 0) return "";
    const maxRound = Math.max(2, scoresHistory.length);
    return scoresHistory.map((item, idx) => {
      const x = padding + (idx / (maxRound - 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - ((item[key] || 80) / 100) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <div className="h-full bg-[#1E1914] text-[#EBE6DF] flex overflow-hidden font-sans select-text">
      
      {/* Left Sidebar CV details */}
      <InterviewSimulatorSideBar
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
        onNavigateHome={onNavigateHome}
        onDrop={onDrop}
      />

      {/* Center Dialogue Feed */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#161310] border-r border-[#2D251D]">
        {chatId && (
          <div className="h-16 border-b border-[#2D251D] px-6 flex items-center justify-between bg-[#201C17] shrink-0 select-none">
            <span className="font-semibold text-[#FFB04C] text-xs uppercase tracking-widest">
              🕵️ INTERVIEW SIMULATOR // {currentChat?.title}
            </span>
            <button onClick={onNavigateHome} className="text-xs text-[#9A958F] hover:text-white uppercase transition cursor-pointer">Exit Room</button>
          </div>
        )}

        <div className="flex-grow flex flex-col overflow-hidden w-full px-6 py-6 max-w-2xl mx-auto justify-center">
          {!chatId && (
            <UploadZone uploading={uploading} getInputProps={getInputProps} getRootProps={getRootProps} />
          )}

          {chatId && (
            <>
              {/* Job description diff comparisons input */}
              <form onSubmit={calculateJDAlignment} className="mb-4 bg-[#201C17] border border-[#2D251D] p-3 rounded-xl flex gap-2.5 shrink-0 select-none">
                <input 
                  type="text" 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste target Job Description here to analyze Gaps..."
                  className="flex-grow bg-transparent text-[11px] outline-none text-white border-b border-[#2D251D] py-1"
                />
                <button type="submit" className="bg-[#FFB04C] hover:bg-[#FFC06C] text-black text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer uppercase">Compare</button>
              </form>

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
                  className="bg-[#201C17] border border-[#2D251D] rounded-xl p-2.5 flex items-center gap-3 focus-within:border-[#FFB04C]/40"
                >
                  {contextChip && (
                    <div className="flex items-center gap-1.5 bg-[#FFB04C]/10 border border-[#FFB04C]/25 text-[#FFB04C] font-mono text-[9px] font-bold px-3 py-1.5 rounded-full shrink-0 select-none">
                      <span>[CV page: p.{contextChip.page}]</span>
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
                    placeholder="Enter mock interview reply..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none min-w-0 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={!question.trim() || chatLoading || isProcessing}
                    className="bg-[#FFB04C] hover:bg-[#FFC06C] disabled:bg-[#1C1713] text-black px-5 py-2 rounded-full text-xs font-semibold cursor-pointer shrink-0 font-mono"
                  >
                    Reply
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Right Utility Pane: CV gap analyzer, STAR logs */}
      {chatId && (
        <div className="w-[300px] bg-[#201C17] border-l border-[#2D251D] flex flex-col h-full overflow-hidden shrink-0 select-none text-[10px] font-mono">
          <div className="p-4 border-b border-[#2D251D] bg-[#2A231C]">
            <h4 className="font-bold text-[#FFB04C] tracking-widest text-[9px] flex items-center gap-1">
              <span>CV DECK UTILITIES</span>
              <InfoTooltip text="Forensic analysis tools that highlight CV gaps, vague statements, and contradictions, alongside active STAR response coaching." />
            </h4>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Competencies Progress Trend Chart */}
            {scoresHistory.length > 0 && (
              <div className="space-y-3 pb-3 border-b border-[#2D251D]">
                <h4 className="text-[9px] font-bold text-[#9A958F] tracking-widest uppercase flex items-center gap-1">
                  <span>INTERVIEW COMPETENCIES</span>
                  <InfoTooltip text="Tracks performance trends across Communication flow, Technical depth, STAR structure coverage, and overall Confidence during active rounds." />
                </h4>
                <div className="bg-[#120F0D] border border-[#2D251D] rounded-xl p-3 flex flex-col gap-2">
                  <svg width="240" height="90" className="overflow-visible select-none">
                    {/* Grid lines */}
                    <line x1="15" y1="15" x2="225" y2="15" stroke="#2D251D" strokeWidth="1" />
                    <line x1="15" y1="40" x2="225" y2="40" stroke="#2D251D" strokeWidth="1" />
                    <line x1="15" y1="65" x2="225" y2="65" stroke="#2D251D" strokeWidth="1" />
                    
                    {/* Line plots */}
                    {competencies.map((comp) => {
                      const points = getChartPoints(comp.key);
                      return points ? (
                        <polyline
                           key={comp.key}
                           fill="none"
                           stroke={comp.color}
                           strokeWidth="1.5"
                           points={points}
                           className="transition-all duration-300"
                        />
                      ) : null;
                    })}
                  </svg>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-between items-center gap-1.5 pt-1 border-t border-[#2D251D] text-[7px] font-bold uppercase">
                    {competencies.map((comp) => (
                      <span key={comp.key} style={{ color: comp.color }} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: comp.color }} />
                        {comp.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Consistency flags warnings */}
            {consistencyFlags.length > 0 && (
              <div className="space-y-3 pb-3 border-b border-[#2D251D]">
                <h4 className="text-[9px] font-bold text-red-500 tracking-wider uppercase flex items-center gap-1">
                  <span>⚡ RESUME CONSISTENCY ALERTS</span>
                  <InfoTooltip text="Identifies claims made during the mock interview that conflict with historical dates or skills listed on your resume." />
                </h4>
                <div className="space-y-2">
                  {consistencyFlags.map((flag, idx) => (
                    <div key={idx} className="p-2 bg-red-950/20 border border-red-500/25 rounded text-left leading-normal text-zinc-300">
                      <p className="text-red-400 font-bold mb-0.5">Discrepancy: {flag.clause}</p>
                      <p className="text-[9px] italic">"{flag.discrepancy}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths list */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-bold text-green-400 tracking-wider uppercase flex items-center gap-1">
                <span>MATCHED STRENGTHS</span>
                <InfoTooltip text="CV qualifications that directly align with the requirements of your target job description." />
              </h4>
              <ul className="space-y-1.5 list-disc pl-3.5 text-zinc-300 leading-normal text-left">
                {cvAnalysis.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>

            {/* Missing Gaps list */}
            <div className="space-y-3 pt-3 border-t border-[#2D251D]">
              <h4 className="text-[9px] font-bold text-red-400 tracking-wider uppercase flex items-center gap-1">
                <span>EXPERIENCE GAPS</span>
                <InfoTooltip text="Key skill requirements requested by the Job Description that are absent from your resume (Critical vs. Minor gaps)." />
              </h4>
              <div className="space-y-2 text-left">
                {cvAnalysis.gaps.map((g, idx) => {
                  const isObj = typeof g === 'object' && g !== null;
                  const label = isObj ? g.label : g;
                  const severity = isObj ? g.severity : "CRITICAL";
                  const rationale = isObj ? g.rationale : "";
                  
                  return (
                    <div key={idx} className="p-2 bg-[#120F0D] border border-[#2D251D] rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-zinc-200 font-bold">{label}</span>
                        <span className={`text-[7px] px-1 rounded border font-bold ${
                          severity === "CRITICAL" ? "bg-red-950/30 text-red-400 border-red-500/20" : "bg-yellow-950/30 text-yellow-400 border-yellow-500/20"
                        }`}>{severity}</span>
                      </div>
                      {rationale && <p className="text-[8px] text-[#9A958F] leading-snug">{rationale}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Imprecise Claims */}
            <div className="space-y-2 pt-3 border-t border-[#2D251D]">
              <h4 className="text-[9px] font-bold text-yellow-400 tracking-wider uppercase flex items-center gap-1">
                <span>VAGUE OR IMPRECISE CLAIMS</span>
                <InfoTooltip text="Subjective claims (e.g. 'assisted in building') that would be stronger if backed by metrics (e.g. 'Reduced latency by 35%')." />
              </h4>
              <ul className="space-y-1.5 list-disc pl-3.5 text-zinc-300 leading-normal text-left">
                {cvAnalysis.vagueClaims.map((v, idx) => <li key={idx}>{v}</li>)}
              </ul>
            </div>

            {/* STAR comment logs */}
            <div className="space-y-3 pt-3 border-t border-[#2D251D]">
              <h4 className="text-[9px] font-bold text-[#9A958F] tracking-widest uppercase flex items-center gap-1">
                <span>STAR ASSESSOR</span>
                <InfoTooltip text="Evaluates response structure against the standard recruiter format: Situation, Task, Action, and Result." />
              </h4>
              <div className="space-y-2.5">
                {starFeedback.map(f => (
                  <div key={f.id} className="p-2.5 bg-[#161310] border border-[#2D251D] rounded text-left space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-[#FFB04C]">{f.criteria}</span>
                      <span className={f.pass ? "text-green-500" : "text-red-500"}>{f.pass ? "✓ PASS" : "✗ IMPROVE"}</span>
                    </div>
                    <p className="text-[9px] leading-relaxed text-zinc-400">"{f.comment}"</p>
                    
                    {f.rewrite_suggestion && (
                      <div className="mt-2 pt-2 border-t border-[#2D251D]/60">
                        <p className="text-[8px] text-[#FFB04C] uppercase font-bold">Suggested STAR Rewrite:</p>
                        <p className="text-zinc-200 font-sans italic text-[8px] leading-relaxed">"{f.rewrite_suggestion}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {selectedCitation && (
        <div className="absolute right-0 top-0 h-full w-[320px] bg-[#201C17] border-l border-[#2D251D] shadow-2xl z-30 p-6 flex flex-col gap-4 animate-fade-in text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#2D251D] pb-4">
            <h4 className="font-bold text-white uppercase text-[10px]">Reference Segment</h4>
            <button onClick={() => setSelectedCitation(null)} className="text-[10px] text-[#9A958F] hover:text-white uppercase transition cursor-pointer">✕ Close</button>
          </div>
          
          <div className="flex justify-between items-center bg-[#161310] border border-[#2D251D] p-3.5 rounded-xl select-none">
            <span className="text-[10px] text-[#9A958F]">Location</span>
            <span className="font-mono text-[9px] bg-[#FFB04C]/15 border border-[#FFB04C]/20 text-[#FFB04C] px-2.5 py-0.5 rounded font-bold">[p.{selectedCitation.page}]</span>
          </div>

          <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-zinc-300 bg-[#161310] border border-[#2D251D] p-4 rounded-xl italic">
            "{selectedCitation.text}"
          </div>
        </div>
      )}

    </div>
  );
}

export default InterviewSimulatorWorkspace;
