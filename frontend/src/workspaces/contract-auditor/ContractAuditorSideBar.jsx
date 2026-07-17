import { useState, useEffect } from 'react';

function ContractAuditorSideBar({ chats, chatId, setChats, setChatId, setMessages, onNavigateHome, onDrop }) {
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch("http://127.0.0.1:8000/chats?workspace_type=contract-auditor");
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
    <div className="h-screen w-[280px] bg-[#0E0E0E] border-r border-[#2A2A2A] p-6 flex flex-col justify-between shrink-0 z-20 font-mono text-xs select-none">
      <div className="mb-6 flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={onNavigateHome}>
          <span className="font-bold text-white uppercase text-[10px] tracking-wider text-red-500">AUDIT DOCK</span>
        </div>
        <button 
          onClick={handleNewChat} 
          className="text-[9px] bg-red-950/40 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg font-bold tracking-wide uppercase cursor-pointer"
        >
          New File
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-[#888] tracking-widest uppercase">AUDIT ARCHIVE</h3>
          {activeChat ? (
            <div className="bg-[#050505] border border-[#222] rounded-lg p-4 flex flex-col gap-3 shadow-inner">
              <div className="flex items-start gap-3">
                <span className="text-sm mt-0.5 select-none">⚖️</span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-white font-medium truncate">{activeChat.title}.pdf</p>
                  <p className="text-[9px] text-[#888] mt-0.5 font-mono">CONTRACT FILE</p>
                </div>
              </div>
            </div>
          ) : (
            <label className="border border-dashed border-[#2A2A2A] hover:border-red-500/40 rounded-lg p-6 text-center text-[10px] text-[#888] cursor-pointer leading-relaxed block">
              <span>NO ACTIVE AUDIT CONTRACT. CLICK TO UPLOAD.</span>
              <input type="file" accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

        <div className="flex-grow flex flex-col min-h-0">
          <h3 className="text-[10px] font-bold text-[#888] tracking-widest uppercase mb-3">AUDIT RECORDS</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {chats.map((c) => (
              <div 
                key={c.chat_id}
                onClick={() => handleChatSelect(c.chat_id)}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition select-none group ${
                  chatId === c.chat_id 
                    ? 'bg-red-950/40 border-red-500/30 text-white font-bold' 
                    : 'bg-[#121212] border-[#222] text-[#888] hover:bg-[#161616]'
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

export default ContractAuditorSideBar;
