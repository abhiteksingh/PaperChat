import { useState, useEffect } from 'react';

function InterviewSimulatorSideBar({ chats, chatId, setChats, setChatId, setMessages, onNavigateHome, onDrop }) {
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch("http://127.0.0.1:8000/chats?workspace_type=interview-simulator");
        if (response.ok) {
          const data = await response.json();
          setChats(data.chats);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchChats();
  }, [chatId, setChats]);

  const handleChatSelect = async (selectedId) => {
    try {
      setChatId(selectedId);
      const response = await fetch("http://127.0.0.1:8000/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: selectedId })
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleNewChat = () => {
    setChatId("");
    setMessages([]);
  };

  const handleDelete = async (chatIdToDelete, e) => {
    e.stopPropagation();
    try {
      await fetch("http://127.0.0.1:8000/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatIdToDelete })
      });
      setChats(prev => prev.filter(chat => chat.chat_id !== chatIdToDelete));
      if (chatId === chatIdToDelete) {
        setChatId("");
        setMessages([]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onDrop([file]);
    }
  };

  const activeChat = chats.find(c => c.chat_id === chatId);

  return (
    <div className="h-screen w-[280px] bg-[#1C1713] border-r border-[#2D251D] p-6 flex flex-col justify-between shrink-0 z-20 font-sans text-xs text-[#EBE6DF] select-none">
      <div className="mb-6 flex items-center justify-between border-b border-[#2D251D] pb-4">
        <div className="flex items-center gap-1.5 cursor-pointer font-bold text-[#FFB04C]" onClick={onNavigateHome}>
          <span>SIMULATOR BOARD</span>
        </div>
        <button 
          onClick={handleNewChat} 
          className="text-[9px] bg-[#FFB04C] hover:bg-[#FFC06C] text-black px-3 py-1.5 rounded-full font-bold cursor-pointer"
        >
          NEW ROLE
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Upload resume */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-[#9A958F] tracking-wider uppercase">Candidate CV</h3>
          {activeChat ? (
            <div className="bg-[#120F0D] border border-[#2D251D] p-3.5 rounded-xl flex items-center gap-2">
              <span>📄</span>
              <span className="truncate flex-1 text-white text-[11px] font-mono">{activeChat.title}.pdf</span>
            </div>
          ) : (
            <label className="border border-dashed border-[#2D251D] hover:border-[#FFB04C]/40 rounded-xl p-5 text-center text-[10px] text-[#9A958F] cursor-pointer block leading-normal">
              <span>DROP RESUME PDF HERE OR CLICK</span>
              <input type="file" accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Interview history log */}
        <div className="flex-grow flex flex-col min-h-0">
          <h3 className="text-[10px] font-bold text-[#9A958F] tracking-wider uppercase mb-3">MOCK ROUNDS</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {chats.map((c) => (
              <div 
                key={c.chat_id}
                onClick={() => handleChatSelect(c.chat_id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none group ${
                  chatId === c.chat_id 
                    ? 'bg-[#FFB04C]/10 border-[#FFB04C]/30 text-white font-bold' 
                    : 'bg-[#1C1713] border-[#2D251D] text-[#9A958F] hover:bg-[#251E1A]'
                }`}
              >
                <span className="truncate text-[10px] pr-2 font-mono">{c.title}</span>
                <button 
                  onClick={(e) => handleDelete(c.chat_id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 font-sans cursor-pointer px-1 text-xs transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default InterviewSimulatorSideBar;
