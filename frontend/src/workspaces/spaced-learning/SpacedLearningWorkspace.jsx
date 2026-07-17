import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import SpacedLearningSideBar from './SpacedLearningSideBar';

function SpacedLearningWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

  // Spaced repetition review queue and outlines
  const [notesContent, setNotesContent] = useState("");
  const [flashcards, setFlashcards] = useState([
    { id: 1, topic: "Vector Search Index", interval: "Due in 1 day", grade: "Good" },
    { id: 2, topic: "Reciprocal Rank Fusion", interval: "Due in 4 days", grade: "New" },
    { id: 3, topic: "Socratic Feedback loops", interval: "Reviewed today", grade: "Easy" }
  ]);

  const [heatmap, setHeatmap] = useState([
    { name: "TF-IDF Indexes", level: "HIGH", color: "#3ECF8E" },
    { name: "BM25 Sparse search", level: "MEDIUM", color: "#FFB04C" },
    { name: "Pinecone dense filters", level: "LOW", color: "#FF4C4C" }
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

      const response = await fetch("http://127.0.0.1:8000/upload?workspace_type=spaced-learning", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Parse failed.");

      setChatId(data.chat_id);
      setMessages([]);
      setChats(prev => [{ chat_id: data.chat_id, title: data.title, status: data.status, workspace_type: "spaced-learning" }, ...prev]);
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
          workspace_type: "study"
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

      // Automatically append key takeaways to notepad canvas editor
      if (data.answer) {
        setNotesContent(prev => prev + `\n\n## Summary Takeaway\n${data.answer.substring(0, 300)}... [p.${pageFilter || 1}]`);
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

  const gradeFlashcard = (id, newGrade) => {
    setFlashcards(prev => prev.map(f => f.id === id ? { ...f, interval: "Rescheduled", grade: newGrade } : f));
  };

  return (
    <div className="h-full bg-white text-zinc-800 flex overflow-hidden font-sans select-text">
      
      {/* Left Sidebar locked to workspace */}
      <SpacedLearningSideBar
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
        onNavigateHome={onNavigateHome}
        onDrop={onDrop}
      />

      {/* Center split Notion editor canvas & dialog */}
      <div className="flex-1 flex overflow-hidden bg-[#FAF9F6]">
        {chatId && (
          <div className="flex-grow flex flex-col h-full overflow-hidden border-r border-[#EBEAE5]">
            
            {/* Outline header */}
            <div className="h-16 border-b border-[#EBEAE5] px-6 flex items-center justify-between bg-white shrink-0 select-none">
              <span className="font-semibold text-zinc-900 text-xs font-serif italic">
                ✍️ STUDY & REPEATED RECALL // {currentChat?.title}
              </span>
              <button onClick={onNavigateHome} className="text-xs text-[#7A7A7A] hover:text-black transition cursor-pointer">Exit study</button>
            </div>

            {/* Split Content layout */}
            <div className="flex-grow flex overflow-hidden">
              
              {/* Left Notion rich-text text area canvas */}
              <div className="w-[320px] border-r border-[#EBEAE5] bg-white p-6 flex flex-col gap-4 overflow-hidden shrink-0 select-none">
                <h4 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase text-left">Synthesis Board</h4>
                <textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Key concepts and outlines automatically compile here during study dialogue. Tap keys to write notes..."
                  className="flex-1 bg-zinc-50 border border-[#EBEAE5] p-4 text-xs leading-relaxed text-[#2C2C2A] placeholder-zinc-400 outline-none rounded-xl resize-none font-serif"
                />
              </div>

              {/* Center message thread list */}
              <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-2xl mx-auto">
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
                    className="bg-white border border-[#EBEAE5] rounded-xl p-2.5 flex items-center gap-3 focus-within:border-[#4C8DFF]/40 shadow-sm"
                  >
                    {contextChip && (
                      <div className="flex items-center gap-1.5 bg-[#4C8DFF]/10 border border-[#4C8DFF]/25 text-[#4C8DFF] font-mono text-[9px] font-bold px-3 py-1.5 rounded-full shrink-0 select-none animate-fade-in">
                        <span>[Study page: p.{contextChip.page}]</span>
                        <button type="button" onClick={() => setContextChip(null)} className="hover:text-red-400 cursor-pointer ml-1">✕</button>
                      </div>
                    )}

                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      disabled={chatLoading || isProcessing}
                      placeholder="Ask study questions..."
                      className="flex-1 bg-transparent text-xs text-zinc-950 placeholder-zinc-400 outline-none min-w-0"
                    />

                    <button
                      type="submit"
                      disabled={!question.trim() || chatLoading || isProcessing}
                      className="bg-zinc-900 hover:bg-black text-white px-5 py-2 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Ask
                    </button>
                  </form>
                </div>
              </div>

            </div>

          </div>
        )}

        {!chatId && (
          <div className="flex-1 flex flex-col h-full items-center justify-center p-6">
            <UploadZone uploading={uploading} getInputProps={getInputProps} getRootProps={getRootProps} />
          </div>
        )}
      </div>

      {/* Right Utility Pane: Anki repetition queue, topic confidence heatmap */}
      {chatId && (
        <div className="w-[300px] bg-white border-l border-[#EBEAE5] flex flex-col h-full overflow-hidden shrink-0 select-none">
          <div className="p-4 border-b border-[#EBEAE5] bg-[#FAF9F6]">
            <h4 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase">SPACED RECALL QUEUE</h4>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Flashcard items */}
            <div className="space-y-3">
              {flashcards.map(f => (
                <div key={f.id} className="p-3.5 bg-[#FAF9F6] border border-[#EBEAE5] rounded-xl text-left space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-[#8E8D88] uppercase tracking-wide">Topic {f.id}</span>
                    <span className="text-[#4C8DFF]">{f.interval}</span>
                  </div>
                  <p className="text-xs font-serif text-zinc-800 font-bold leading-normal">{f.topic}</p>
                  
                  {/* self-grading selectors */}
                  <div className="flex gap-2 pt-1">
                    {["Again", "Good", "Easy"].map(g => (
                      <button 
                        key={g} 
                        onClick={() => gradeFlashcard(f.id, g)}
                        className={`flex-1 text-[9px] font-semibold py-1 rounded border cursor-pointer transition ${
                          f.grade === g 
                            ? "bg-[#4C8DFF] border-[#4C8DFF] text-white" 
                            : "bg-white border-[#EBEAE5] text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence heatmap */}
            <div className="space-y-3 pt-4 border-t border-[#EBEAE5]">
              <h4 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase">CONFIDENCE MATRIX</h4>
              <div className="space-y-2">
                {heatmap.map((h, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#FAF9F6] border border-[#EBEAE5] p-3 rounded-xl">
                    <span className="text-[11px] text-zinc-800 font-medium">{h.name}</span>
                    <span 
                      style={{ backgroundColor: `${h.color}15`, borderColor: `${h.color}30`, color: h.color }}
                      className="text-[9px] font-bold px-2 py-0.5 rounded border uppercase"
                    >
                      {h.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exploratory graph preview at bottom */}
            <div className="pt-4 border-t border-[#EBEAE5] text-center">
              <span className="text-[9px] text-[#8E8D88] uppercase tracking-widest">3D Network map loaded in background</span>
            </div>

          </div>
        </div>
      )}

      {selectedCitation && (
        <div className="absolute right-0 top-0 h-full w-[320px] bg-white border-l border-[#EBEAE5] shadow-2xl z-30 p-6 flex flex-col gap-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-[#EBEAE5] pb-4">
            <h4 className="font-semibold text-zinc-900 font-serif">Page Citation</h4>
            <button onClick={() => setSelectedCitation(null)} className="text-xs text-[#7A7A7A] hover:text-black transition cursor-pointer">✕ Close</button>
          </div>
          
          <div className="flex justify-between items-center bg-[#FAF9F6] border border-[#EBEAE5] p-3.5 rounded-xl select-none font-sans">
            <span className="text-[10px] text-[#7A7A7A]">Page Source</span>
            <span className="font-mono text-[9px] bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-2.5 py-0.5 rounded font-bold">p.{selectedCitation.page}</span>
          </div>

          <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-[#2C2C2A] bg-[#FAF9F6] border border-[#EBEAE5] p-4 rounded-xl italic font-serif">
            "{selectedCitation.text}"
          </div>
        </div>
      )}

    </div>
  );
}

export default SpacedLearningWorkspace;
