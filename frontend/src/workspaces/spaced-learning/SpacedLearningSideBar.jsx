import { useState, useEffect } from 'react';

function SpacedLearningSideBar({ chats, chatId, setChats, setChatId, setMessages, onNavigateHome, onDrop }) {
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch("http://127.0.0.1:8000/chats?workspace_type=spaced-learning");
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
    <div className="h-screen w-[280px] bg-[#FAF8F5] border-r border-[#EBE8E2] p-6 flex flex-col justify-between shrink-0 z-20 font-serif text-[#2C2C2A] select-none">
      <div className="mb-6 flex items-center justify-between border-b border-[#EBE8E2] pb-4">
        <div className="flex items-center gap-1.5 cursor-pointer font-sans" onClick={onNavigateHome}>
          <span className="font-semibold text-xs tracking-widest text-[#4C8DFF] uppercase">STUDY ARCHIVE</span>
        </div>
        <button 
          onClick={handleNewChat} 
          className="text-[9px] bg-white border border-[#EBE8E2] hover:bg-zinc-50 text-zinc-700 px-3 py-1.5 rounded-full font-sans font-bold tracking-wide uppercase shadow-sm cursor-pointer"
        >
          New Study
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex flex-col gap-3 font-sans">
          <h3 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase">TEXT BOOKS</h3>
          {activeChat ? (
            <div className="bg-white border border-[#EBE8E2] rounded-[15px] p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-sm mt-0.5 select-none">🎓</span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-zinc-900 font-bold truncate">{activeChat.title}.pdf</p>
                  <p className="text-[9px] text-[#8E8D88] mt-0.5 font-mono">LECTURE SLIDES</p>
                </div>
              </div>
            </div>
          ) : (
            <label className="border border-dashed border-[#EBE8E2] hover:border-[#4C8DFF]/40 rounded-[15px] p-6 text-center text-[10px] text-[#8E8D88] cursor-pointer leading-relaxed block">
              <span>NO ACTIVE BOOK. CLICK TO UPLOAD.</span>
              <input type="file" accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

        <div className="flex-grow flex flex-col min-h-0 font-sans">
          <h3 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase mb-3">LECTURE HISTORY</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {chats.map((c) => (
              <div 
                key={c.chat_id}
                onClick={() => handleChatSelect(c.chat_id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none group ${
                  chatId === c.chat_id 
                    ? 'bg-white border-[#4C8DFF]/40 text-zinc-900 font-bold shadow-sm' 
                    : 'bg-[#FAF8F5] border-[#EBE8E2] text-zinc-600 hover:bg-[#F3EFE9]'
                }`}
              >
                <span className="truncate text-[11px] pr-2">{c.title}</span>
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

export default SpacedLearningSideBar;
