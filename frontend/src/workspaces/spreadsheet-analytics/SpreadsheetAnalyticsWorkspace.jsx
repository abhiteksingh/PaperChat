import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import SpreadsheetAnalyticsSideBar from './SpreadsheetAnalyticsSideBar';

function SpreadsheetAnalyticsWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

  // Parameter sliders for mathematical concepts simulation
  const [learningRate, setLearningRate] = useState(0.25);
  const [dimensions, setDimensions] = useState(384);
  const [overlap, setOverlap] = useState(128);

  // Deepened utility variables
  const [pinnedScenarios, setPinnedScenarios] = useState([
    { id: 1, name: "Initial Model", rate: 0.25, dim: 384, accuracy: 88.5 },
    { id: 2, name: "IP Overlap Max", rate: 0.45, dim: 512, accuracy: 91.2 }
  ]);
  const [assumptionLog, setAssumptionLog] = useState([
    { time: "17:34", event: "Overlap increased: 128 → 200" },
    { time: "17:35", event: "Learning rate decreased: 0.25 → 0.15" }
  ]);

  const canvasRef = useRef(null);

  const currentChat = chats.find(c => c.chat_id === chatId);
  const isProcessing = currentChat?.status === "processing";
  const isFailed = currentChat?.status === "failed";

  // Equations and calculations computed dynamically
  const vectorDensity = (dimensions * learningRate).toFixed(2);
  const projectedAccuracy = (100 - (1 - learningRate) * 15 - (overlap / dimensions) * 5).toFixed(1);
  const tokenCost = (overlap * dimensions * 0.000045).toFixed(4);

  useEffect(() => {
    setError(null);
    setSelectedCitation(null);
    setContextChip(null);
  }, [chatId]);

  // Log variable modifications dynamically
  useEffect(() => {
    if (!chatId) return;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog = { time: timeStr, event: `Values tweaked (LRate: ${learningRate}, Dim: ${dimensions}, Ov: ${overlap})` };
    setAssumptionLog(prev => [newLog, ...prev.slice(0, 7)]);
  }, [learningRate, dimensions, overlap, chatId]);

  // Renders interactive graphical canvas based on sliders parameters
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

    // Plot simple dynamic math curves
    ctx.strokeStyle = '#3ECF8E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const scaleX = x / width;
      const y = height / 2 - Math.sin(scaleX * Math.PI * 4 * learningRate) * (dimensions / 10) * Math.cos(scaleX * Math.PI * 2 * (overlap / 200));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw axis descriptions
    ctx.fillStyle = '#9A9A9A';
    ctx.font = '9px "Inter", sans-serif';
    ctx.fillText("SIMULATION PLOT WAVEFORM", 15, 20);
    ctx.fillText(`Density Index: ${vectorDensity}`, 15, height - 15);

  }, [learningRate, dimensions, overlap, chatId, vectorDensity]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("http://127.0.0.1:8000/upload?workspace_type=spreadsheet-analytics", {
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

      const response = await fetch("http://127.0.0.1:8000/chat", {
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

  const pinCurrentScenario = () => {
    const name = prompt("Enter Scenario Name:", `Scenario ${pinnedScenarios.length + 1}`);
    if (name) {
      setPinnedScenarios(prev => [
        ...prev,
        { id: Date.now(), name, rate: learningRate, dim: dimensions, accuracy: parseFloat(projectedAccuracy) }
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
        learningRate={learningRate}
        setLearningRate={setLearningRate}
        dimensions={dimensions}
        setDimensions={setDimensions}
        overlap={overlap}
        setOverlap={setOverlap}
        vectorDensity={vectorDensity}
        projectedAccuracy={projectedAccuracy}
        tokenCost={tokenCost}
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
              {/* Graphical Waveform canvas */}
              <div className="h-40 bg-[#0A0A0B] border border-[#2A2A2A] rounded-xl overflow-hidden mb-4 shrink-0 shadow-inner">
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
            <span className="font-bold text-[#3ECF8E] tracking-widest text-[9px]">SCENARIO MANAGER</span>
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
              <h4 className="text-[9px] font-bold text-[#8A8A8A] tracking-wider uppercase">PINNED CONFIGS</h4>
              <div className="space-y-2">
                {pinnedScenarios.map(s => (
                  <div key={s.id} className="p-2.5 bg-[#0D0E10] border border-[#2A2A2A] rounded-lg text-left space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>{s.name}</span>
                      <span className="text-[#3ECF8E]">{s.accuracy}%</span>
                    </div>
                    <div className="flex justify-between text-[#8A8A8A] text-[9px]">
                      <span>LRate: {s.rate}</span>
                      <span>Dim: {s.dim}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                  <p className="text-[#3ECF8E] font-bold">1. Vector Density Eq:</p>
                  <p className="text-[9px] bg-[#222327] p-1.5 rounded mt-0.5 text-white">V_Density = dim * learning_rate</p>
                </div>
                <div>
                  <p className="text-[#3ECF8E] font-bold">2. Cost Matrix Eq:</p>
                  <p className="text-[9px] bg-[#222327] p-1.5 rounded mt-0.5 text-white">Cost = overlap * dim * 0.000045</p>
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
