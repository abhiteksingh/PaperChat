import { useState, useEffect } from 'react';
import API_BASE from '../../api';

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative group inline-block ml-1 select-none font-sans">
      <span 
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-[8px] bg-[#2A2A2A] hover:bg-[#3ECF8E] text-[#8A8A8A] hover:text-black w-3.5 h-3.5 inline-flex items-center justify-center rounded-full cursor-help font-bold transition-colors"
      >
        i
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-[#0D0E10] border border-[#2A2A2A] text-zinc-300 text-[8px] font-sans rounded-md p-2 shadow-xl z-50 leading-normal normal-case pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

function SpreadsheetAnalyticsSideBar({ chats, chatId, setChats, setChatId, setMessages, onNavigateHome, onDrop, variables = [], onVariableChange, outcomeMetric = 0.0 }) {
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch(`${API_BASE}/chats?workspace_type=spreadsheet-analytics`);
        if (response.ok) {
          const data = await response.json();
          setChats(data.chats);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchChats();
  }, []);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onDrop([file]);
    }
  };

  const activeChat = chats.find(c => c.chat_id === chatId);

  return (
    <div className="h-screen w-[280px] bg-[#1A1B1F] border-r border-[#2A2A2A] p-6 flex flex-col justify-between shrink-0 z-20 font-mono text-[11px] text-[#E3E3E3] select-none">
      <div className="flex flex-col gap-6 overflow-hidden">
        
        {/* Header branding */}
        <div className="mb-2 flex items-center justify-between border-b border-[#2A2A2A] pb-4">
          <div className="flex items-center gap-1.5 cursor-pointer font-bold text-[#3ECF8E]" onClick={onNavigateHome}>
            <span>ANALYTICS LAB</span>
          </div>
          <button 
            onClick={handleNewChat} 
            className="text-[9px] bg-[#3ECF8E] hover:bg-[#4EFE9E] text-black px-2.5 py-1 rounded font-bold cursor-pointer"
          >
            NEW CSV
          </button>
        </div>

        {/* Upload row */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-[#8A8A8A] tracking-wider uppercase">Active Datasets</h3>
          {activeChat ? (
            <div className="bg-[#0D0E10] border border-[#2A2A2A] p-3 rounded-lg flex items-center gap-2">
              <span>📊</span>
              <span className="truncate flex-1 text-white text-[10px]">{activeChat.title}.csv</span>
            </div>
          ) : (
            <label className="border border-dashed border-[#2A2A2A] hover:border-[#3ECF8E]/40 rounded-lg p-5 text-center text-[#8A8A8A] cursor-pointer block">
              <span>DRAG DATASET HERE OR CLICK</span>
              <input type="file" accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Dynamic Sliders rows (Left Pane UI controls) */}
        {chatId && variables.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[#2A2A2A] overflow-y-auto max-h-[350px] pr-1" style={{ scrollbarWidth: 'thin' }}>
            <h3 className="text-[10px] font-bold text-[#3ECF8E] tracking-wider uppercase flex items-center gap-1">
              <span>BUSINESS VARIABLES</span>
              <InfoTooltip text="Numerical variables parsed from your uploaded spreadsheet. Adjust the sliders to simulate changes in your business model." />
            </h3>

            {variables.map((v, idx) => (
              <div key={idx} className="space-y-1.5 text-left font-sans">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-[#8A8A8A] truncate max-w-[150px]">{v.name}</span>
                  <span className="text-white font-bold">{(v.value !== undefined ? v.value : v.mean).toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min={v.min} 
                  max={v.max} 
                  step={(v.max - v.min) / 100 || 0.01} 
                  value={v.value !== undefined ? v.value : v.mean} 
                  onChange={(e) => onVariableChange(v.name, parseFloat(e.target.value))}
                  className="w-full accent-[#3ECF8E] cursor-pointer"
                />
              </div>
            ))}

            {/* Sim outcomes */}
            <div className="border-t border-[#2A2A2A] pt-4 space-y-2 text-[10px]">
              <div className="flex justify-between font-sans items-center">
                <span className="text-[#8A8A8A] font-bold uppercase flex items-center gap-1">
                  <span>OUTCOME INDEX</span>
                  <InfoTooltip text="The top-line score computed using the sandbox mathematical formulas." />
                </span>
                <span className="text-[#3ECF8E] font-bold text-[12px] font-mono">
                  {outcomeMetric.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default SpreadsheetAnalyticsSideBar;
