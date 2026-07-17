import { useState, useEffect } from 'react'

function SideBar({ chats, chatId, setChatId, setChats, setMessages, onNavigateHome }) {
  const [includeContext, setIncludeContext] = useState(true);

  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch("http://127.0.0.1:8000/chats")
        if (response.ok) {
          const data = await response.json()
          setChats(data.chats)
        }
      } catch (error) {
        console.error(error)
      }
    }
    fetchChats()
  }, [])

  const handleChatFunction = async (selectedId) => {
    try {
      setChatId(selectedId);
      const response = await fetch("http://127.0.0.1:8000/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chat_id: selectedId })
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const handleNewChat = () => {
    setChatId("")
    setMessages([])
  }

  const handleDelete = async (chatIdToDelete, e) => {
    e.stopPropagation(); // Prevent trigger active state on click
    try {
      await fetch("http://127.0.0.1:8000/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chat_id: chatIdToDelete })
      });
      setChats(prev => prev.filter(chat => chat.chat_id !== chatIdToDelete));
      if (chatId === chatIdToDelete) {
        setChatId("")
        setMessages([])
      }
    } catch (error) {
      console.error(error)
    }
  }

  const activeChat = chats.find(c => c.chat_id === chatId);

  return (
    <div className="h-screen w-[300px] bg-[#161616] border-r border-[#2A2A2A] p-6 flex flex-col justify-between shrink-0 z-20">
      
      {/* Brand Header */}
      <div className="mb-6 flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={onNavigateHome}>
          <span className="font-display text-xl font-medium tracking-tight text-white">Docent</span>
          <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full mt-1.5"></span>
        </div>
        <button 
          onClick={handleNewChat} 
          className="text-[10px] bg-[#4C8DFF] hover:bg-[#6FA2FF] text-white px-3 py-1.5 rounded-full font-semibold tracking-wide shadow-[0_0_15px_rgba(76,141,255,0.1)] transition cursor-pointer"
        >
          New Chat
        </button>
      </div>

      {/* Stacked panels */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Section 1: Active Files */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[#9A9A9A] tracking-wider uppercase select-none">Active Files</h3>
          
          {activeChat ? (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-[20px] p-4 flex flex-col gap-3 shadow-inner">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 select-none">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-white font-medium truncate">{activeChat.title}.pdf</p>
                  <p className="text-[10px] text-[#9A9A9A] mt-0.5 font-mono">PDF Document</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeContext} 
                  onChange={(e) => setIncludeContext(e.target.checked)}
                  className="mt-1 w-3.5 h-3.5 rounded border-[#2A2A2A] text-[#4C8DFF] focus:ring-[#4C8DFF]/40 cursor-pointer"
                />
              </div>

              {/* Dashed upload secondary file */}
              <button 
                onClick={handleNewChat} 
                className="border border-dashed border-[#2A2A2A] hover:border-[#4C8DFF]/40 rounded-xl py-2 flex items-center justify-center gap-1.5 text-[10px] text-[#9A9A9A] hover:text-white transition cursor-pointer"
              >
                <span>+</span>
                <span>Add file</span>
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-[#2A2A2A] rounded-[20px] p-6 text-center text-xs text-[#9A9A9A] select-none leading-relaxed">
              No files yet. Drop one in to start asking.
            </div>
          )}
        </div>

        {/* Section 2: Conversation History */}
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <h3 className="text-xs font-semibold text-[#9A9A9A] tracking-wider uppercase select-none">Chat History</h3>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2 pr-1">
            {chats.length > 0 ? (
              chats.map((chat) => (
                <div
                  key={chat.chat_id}
                  onClick={() => {
                    if (chat.status !== "failed") {
                      handleChatFunction(chat.chat_id);
                    }
                  }}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                    chat.chat_id === chatId
                      ? "bg-[#4C8DFF] border-[#4C8DFF] text-white shadow-[0_0_15px_rgba(76,141,255,0.15)] font-medium"
                      : chat.status === "failed"
                        ? "bg-red-950/10 border-red-950/20 text-red-400/50 cursor-not-allowed"
                        : "bg-[#0A0A0A] border-[#2A2A2A] hover:border-[#4C8DFF]/40 text-[#E8E8E8] hover:text-white"
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs truncate font-medium">{chat.title}</span>
                    <span className={`text-[9px] mt-0.5 font-mono ${chat.chat_id === chatId ? 'text-white/70' : 'text-[#9A9A9A]'}`}>
                      {chat.status === "processing" ? "Indexing..." : chat.status === "failed" ? "Failed" : "Indexed"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(chat.chat_id, e)}
                    className={`p-1.5 rounded-lg border border-transparent transition opacity-0 group-hover:opacity-100 flex items-center justify-center shrink-0 cursor-pointer ${
                      chat.chat_id === chatId
                        ? "hover:bg-white/10 text-white/70 hover:text-white"
                        : "hover:bg-red-950/30 hover:border-red-500/20 text-[#9A9A9A] hover:text-red-400"
                    }`}
                    title="Delete Chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-[#9A9A9A] select-none leading-relaxed italic">
                Nothing here yet — your conversations will show up as you go.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer Branding inside sidebar */}
      <div className="border-t border-[#2A2A2A] pt-4 mt-4 text-[10px] text-[#9A9A9A] text-left select-none">
        <span>Docent Workspace</span>
      </div>

    </div>
  );
}

export default SideBar;
