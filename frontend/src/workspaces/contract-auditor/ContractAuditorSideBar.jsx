import { useState, useEffect } from 'react';
import API_BASE from '../../api';

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative group inline-block ml-1 select-none font-sans font-normal normal-case">
      <span 
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-[8px] bg-[#2A2A2A] hover:bg-[#3ECF8E] text-[#8A8A8A] hover:text-black w-3 h-3 inline-flex items-center justify-center rounded-full cursor-help font-bold transition-colors"
      >
        i
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-[#0D0E10] border border-[#2A2A2A] text-zinc-300 text-[8px] font-sans rounded-md p-2 shadow-xl z-50 leading-normal normal-case pointer-events-none text-left">
          {text}
        </span>
      )}
    </span>
  );
}

function ContractAuditorSideBar({ chats, chatId, setChats, setChatId, setMessages, onNavigateHome, onDrop, onSelectClause, onSelectMissingClause }) {
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch(`${API_BASE}/chats?workspace_type=contract-auditor`);
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
      const response = await fetch(`${API_BASE}/messages`, {
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
      await fetch(`${API_BASE}/delete`, {
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

  let missingClauses = [];
  let vulnerabilities = [];
  if (activeChat && activeChat.analysis_results_json) {
    try {
      const parsed = JSON.parse(activeChat.analysis_results_json);
      missingClauses = parsed.missing_clauses || [];
      vulnerabilities = parsed.vulnerabilities || [];
    } catch (e) {
      console.error(e);
    }
  }

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

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
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

              {/* Clause-level Heatmap Index */}
              {vulnerabilities.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#222] text-left">
                  <h4 className="text-[8px] font-bold text-[#888] tracking-widest uppercase flex items-center gap-1">
                    <span>CLAUSE RISK INDEX</span>
                    <InfoTooltip text="Scanned contract pages classified by risk level (Red: Critical Vulnerability, Yellow: Warning Alert, Blue: Ambiguous wording)." />
                  </h4>
                  <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {vulnerabilities.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => onSelectClause && onSelectClause(v.page, v.label)}
                        className="p-1 bg-[#121212] border border-[#222] hover:border-red-500/30 rounded flex items-center justify-between cursor-pointer transition"
                      >
                        <span className="truncate text-[8px] text-zinc-300 font-mono">p.{v.page} - {v.label}</span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          v.type === "CRITICAL" ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" : v.type === "WARNING" ? "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]" : "bg-blue-400"
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Protections list */}
              {missingClauses.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#222] text-left">
                  <h4 className="text-[8px] font-bold text-[#FF4C4C] tracking-widest uppercase flex items-center gap-1">
                    <span className="animate-pulse">⚠️</span>
                    <span>MISSING PROTECTIONS</span>
                    <InfoTooltip text="Standard commercial safeguards (e.g. Limitation of Liability limits, Data Processing Addendums) that are absent from this contract draft." />
                  </h4>
                  <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {missingClauses.map((clause, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectMissingClause && onSelectMissingClause(clause)}
                        className="p-1 bg-red-950/20 border border-red-950/50 rounded flex items-center gap-1.5 cursor-pointer hover:border-red-500/30 transition text-left"
                      >
                        <span className="text-red-400 font-mono text-[8px]">✕ {clause}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
