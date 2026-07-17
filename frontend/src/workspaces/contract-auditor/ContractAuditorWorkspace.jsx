import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import ContractAuditorSideBar from './ContractAuditorSideBar';

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
    { id: 1, label: "Indemnity Cap Missing", type: "CRITICAL", page: 1, text: "Section 4.1 contains unlimited indemnification on intellectual property infringements." },
    { id: 2, label: "Notice period too short", type: "AMBIGUOUS", page: 2, text: "Section 7.3 specifies only a 10-day notice window for material breach terminations." },
    { id: 3, label: "Unilateral modifications allowed", type: "WARNING", page: 3, text: "Section 12.2 permits the service provider to amend compliance rules unilaterally with notice." }
  ]);

  const [obligations, setObligations] = useState([
    { date: "Oct 12, 2026", event: "Renewal Notification Deadline", status: "PENDING" },
    { date: "Jan 15, 2027", event: "Initial Service Window Termination", status: "ALERT" },
    { date: "May 30, 2027", event: "SLA Metric Audit Window", status: "COMPLETED" }
  ]);

  const currentChat = chats.find(c => c.chat_id === chatId);
  const isProcessing = currentChat?.status === "processing";
  const isFailed = currentChat?.status === "failed";

  useEffect(() => {
    setError(null);
    setSelectedCitation(null);
    setContextChip(null);
  }, [chatId]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("http://127.0.0.1:8000/upload?workspace_type=contract-auditor", {
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

      const response = await fetch("http://127.0.0.1:8000/chat", {
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

      // Adjust mock severity score dynamically
      if (questionToSend.toLowerCase().includes("risk") || questionToSend.toLowerCase().includes("indemnity")) {
        setComplianceScore(prev => Math.max(prev - 8, 45));
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
          <div className="p-4 border-b border-[#222] bg-[#121212] flex flex-col gap-1.5 text-center">
            <span className="font-bold text-[#888] tracking-widest text-[9px]">COMPLIANCE SCORE</span>
            <div className="flex justify-center items-baseline gap-1 py-1.5">
              <span className={`text-3xl font-bold ${complianceScore > 70 ? 'text-green-500' : 'text-red-500'}`}>{complianceScore}</span>
              <span className="text-[10px] text-[#888]">/100</span>
            </div>
            <p className="text-[8px] text-red-500/80 font-bold uppercase leading-normal px-2 py-1 bg-red-950/20 border border-red-500/20 rounded">
              ⚠️ Gut-check score for founders. Not legal advice.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Obligation deadlines timeline */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-bold text-[#888] tracking-widest uppercase">OBLIGATION TIMELINE</h4>
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

            {/* Redline list & export */}
            <div className="space-y-3 pt-3 border-t border-[#222]">
              <div className="flex justify-between items-center">
                <h4 className="text-[9px] font-bold text-[#888] tracking-widest uppercase">REDLINE COMMENTS</h4>
                <button 
                  onClick={copyRedlinesToClipboard}
                  className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                >
                  Export Log
                </button>
              </div>
              <div className="space-y-2">
                {vulnerabilities.map(v => (
                  <div key={v.id} className="p-2.5 bg-[#050505] border border-[#222] rounded text-left font-mono text-[9px] leading-relaxed text-zinc-400">
                    <div className="flex justify-between text-[#888] mb-1 font-bold">
                      <span>CLAUSE {v.id}</span>
                      <span>PAGE {v.page}</span>
                    </div>
                    "{v.text}"
                  </div>
                ))}
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
