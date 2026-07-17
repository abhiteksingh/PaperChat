import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import InterviewSimulatorSideBar from './InterviewSimulatorSideBar';

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
    gaps: ["No explicit cloud infrastructure (AWS/GCP) listed.", "Missing Docker/Kubernetes container orchestrations."],
    vagueClaims: ["'Helped build a RAG application' — needs exact metrics (e.g. latency, chunk count)."]
  });

  const [starFeedback, setStarFeedback] = useState([
    { id: 1, criteria: "SITUATION", comment: "Well framed context about database latency issues.", pass: true },
    { id: 2, criteria: "TASK", comment: "Identified the goal to migrate SQLite indices.", pass: true },
    { id: 3, criteria: "ACTION", comment: "Good technical details on Pinecone metadata.", pass: true },
    { id: 4, criteria: "RESULT", comment: "Missing exact performance output percentages.", pass: false }
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

      const response = await fetch("http://127.0.0.1:8000/upload?workspace_type=interview-simulator", {
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

      const response = await fetch("http://127.0.0.1:8000/chat", {
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
            <h4 className="font-bold text-[#FFB04C] tracking-widest text-[9px]">CV GAP ANALYZER</h4>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Strengths list */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-bold text-green-400 tracking-wider uppercase">MATCHED STRENGTHS</h4>
              <ul className="space-y-1.5 list-disc pl-3.5 text-zinc-300 leading-normal text-left">
                {cvAnalysis.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>

            {/* Missing Gaps list */}
            <div className="space-y-2 pt-3 border-t border-[#2D251D]">
              <h4 className="text-[9px] font-bold text-red-400 tracking-wider uppercase">EXPERIENCE GAPS</h4>
              <ul className="space-y-1.5 list-disc pl-3.5 text-zinc-300 leading-normal text-left">
                {cvAnalysis.gaps.map((g, idx) => <li key={idx}>{g}</li>)}
              </ul>
            </div>

            {/* Imprecise Claims */}
            <div className="space-y-2 pt-3 border-t border-[#2D251D]">
              <h4 className="text-[9px] font-bold text-yellow-400 tracking-wider uppercase">VAGUE OR IMPRECISE CLAIMS</h4>
              <ul className="space-y-1.5 list-disc pl-3.5 text-zinc-300 leading-normal text-left">
                {cvAnalysis.vagueClaims.map((v, idx) => <li key={idx}>{v}</li>)}
              </ul>
            </div>

            {/* STAR comment logs */}
            <div className="space-y-3 pt-3 border-t border-[#2D251D]">
              <h4 className="text-[9px] font-bold text-[#9A958F] tracking-widest uppercase">STAR ASSESSOR</h4>
              <div className="space-y-2">
                {starFeedback.map(f => (
                  <div key={f.id} className="p-2.5 bg-[#161310] border border-[#2D251D] rounded text-left space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-[#FFB04C]">{f.criteria}</span>
                      <span className={f.pass ? "text-green-500" : "text-red-500"}>{f.pass ? "✓ PASS" : "✗ IMPROVE"}</span>
                    </div>
                    <p className="text-[9px] leading-relaxed text-zinc-400">"{f.comment}"</p>
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
