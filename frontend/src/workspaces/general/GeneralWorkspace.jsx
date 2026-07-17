import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import GeneralSideBar from './GeneralSideBar';

function GeneralWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

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

      const response = await fetch("http://127.0.0.1:8000/upload?workspace_type=chat", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to parse PDF document.");
      }

      setChatId(data.chat_id);
      setMessages([]);
      setChats(prev => [
        {
          chat_id: data.chat_id,
          title: data.title,
          status: data.status,
          workspace_type: "chat"
        },
        ...prev
      ]);
    }
    catch (err) {
      console.error(err);
      setError(err.message || "Network error: Failed to connect to the backend server.");
    }
    finally {
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
          workspace_type: "chat"
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
    }
    finally {
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
      if (data && data.page) {
        setContextChip(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full bg-[#0A0A0A] text-[#E8E8E8] flex overflow-hidden relative font-body">
      
      {/* Left Sidebar locked within the workspace view */}
      <GeneralSideBar 
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
        onNavigateHome={onNavigateHome}
        onDrop={onDrop}
      />

      {/* Center Chat Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {chatId && (
          <div className="h-16 border-b border-[#2A2A2A] px-6 flex items-center justify-between bg-[#161616]/40 select-none shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-white font-medium">
                {chats.find(c => c.chat_id === chatId)?.title}.pdf
              </span>
              {!isProcessing && !isFailed && (
                <span className="bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 text-[#4C8DFF] text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                  General RAG ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={onNavigateHome} className="text-xs text-[#9A9A9A] hover:text-white transition cursor-pointer">
                Go Home
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 w-full px-6 py-6 flex flex-col overflow-hidden justify-center max-w-4xl mx-auto z-10">
          
          {error && (
            <div className="mb-6 p-4 bg-red-950/20 border border-red-500/20 text-red-200 rounded-[20px] flex items-center justify-between backdrop-blur-xl animate-fade-in shadow-lg shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-lg select-none">⚠️</span>
                <p className="text-xs font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 text-xs font-semibold cursor-pointer">Dismiss</button>
            </div>
          )}

          {!chatId && (
            <UploadZone uploading={uploading} getInputProps={getInputProps} getRootProps={getRootProps} />
          )}

          {chatId && (
            <>
              <MessageList
                messages={messages}
                chatLoading={chatLoading}
                isProcessing={isProcessing}
                isFailed={isFailed}
                onSelectCitation={(cit) => setSelectedCitation(cit)}
              />

              <div className="mt-4 flex flex-col gap-3 shrink-0">
                <form 
                  onSubmit={handleChatSubmit}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-2.5 flex items-center gap-3 shadow-inner"
                >
                  {contextChip && (
                    <div className="flex items-center gap-1.5 bg-[#4C8DFF]/15 border border-[#4C8DFF]/25 text-[#4C8DFF] font-mono text-[9px] font-bold px-3 py-1.5 rounded-full shrink-0 select-none animate-fade-in">
                      <span>[Context: p.{contextChip.page} - {contextChip.header}]</span>
                      <button type="button" onClick={() => setContextChip(null)} className="hover:text-red-400 cursor-pointer text-[10px] ml-1">✕</button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={chatLoading || isProcessing}
                    placeholder="Ask your files anything or drop a graph node..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-[#9A9A9A] outline-none min-w-0"
                  />

                  <button
                    type="submit"
                    disabled={!question.trim() || chatLoading || isProcessing}
                    className="bg-[#4C8DFF] hover:bg-[#6FA2FF] disabled:bg-[#161616] text-white px-5 py-2 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>

      {chatId && (
        <ConceptGraph3D
          chatId={chatId}
          chats={chats}
          messages={messages}
          workspaceType={workspaceType}
        />
      )}

      {selectedCitation && (
        <div className="absolute right-0 top-0 h-full w-[320px] bg-[#161616] border-l border-[#2A2A2A] shadow-2xl z-30 p-6 flex flex-col gap-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
            <h4 className="font-display text-sm text-white font-medium">Reference Excerpt</h4>
            <button onClick={() => setSelectedCitation(null)} className="text-xs text-[#9A9A9A] hover:text-white transition cursor-pointer">✕ Close</button>
          </div>
          
          <div className="flex justify-between items-center bg-[#0A0A0A] border border-[#2A2A2A] p-3.5 rounded-xl select-none">
            <span className="text-[10px] text-[#9A9A9A] font-mono">Location</span>
            <span className="font-mono text-[9px] bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-2.5 py-0.5 rounded font-bold">[p.{selectedCitation.page}]</span>
          </div>

          <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-zinc-300 bg-[#0A0A0A] border border-[#2A2A2A] p-4 rounded-xl italic">
            "{selectedCitation.text}"
          </div>
        </div>
      )}

    </div>
  );
}

export default GeneralWorkspace;
