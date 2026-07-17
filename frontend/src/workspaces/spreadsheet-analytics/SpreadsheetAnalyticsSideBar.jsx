import { useState, useEffect } from 'react';

function SpreadsheetAnalyticsSideBar({ chats, chatId, setChats, setChatId, setMessages, onNavigateHome, onDrop, learningRate, setLearningRate, dimensions, setDimensions, overlap, setOverlap, vectorDensity, projectedAccuracy, tokenCost }) {
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch("http://127.0.0.1:8000/chats?workspace_type=spreadsheet-analytics");
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

        {/* Sliders rows (Left Pane UI controls) */}
        {chatId && (
          <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
            <h3 className="text-[10px] font-bold text-[#3ECF8E] tracking-wider uppercase">LAB VARIABLES</h3>

            {/* learningRate slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-[#8A8A8A]">Learning rate</span>
                <span className="text-white font-bold">{learningRate}</span>
              </div>
              <input 
                type="range" min="0.01" max="1.0" step="0.01" 
                value={learningRate} 
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full accent-[#3ECF8E] cursor-pointer"
              />
            </div>

            {/* dimensions slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-[#8A8A8A]">Vector dimensions</span>
                <span className="text-white font-bold">{dimensions}d</span>
              </div>
              <input 
                type="range" min="64" max="1024" step="64" 
                value={dimensions} 
                onChange={(e) => setDimensions(parseInt(e.target.value))}
                className="w-full accent-[#3ECF8E] cursor-pointer"
              />
            </div>

            {/* overlap slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono">
                <span className="text-[#8A8A8A]">Chunk overlap</span>
                <span className="text-white font-bold">{overlap} tokens</span>
              </div>
              <input 
                type="range" min="10" max="256" step="10" 
                value={overlap} 
                onChange={(e) => setOverlap(parseInt(e.target.value))}
                className="w-full accent-[#3ECF8E] cursor-pointer"
              />
            </div>

            {/* Sim outcomes */}
            <div className="border-t border-[#2A2A2A] pt-4 space-y-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Density:</span>
                <span className="text-white font-bold">{vectorDensity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Accuracy:</span>
                <span className="text-white font-bold">{projectedAccuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Cost:</span>
                <span className="text-white font-bold">${tokenCost}</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default SpreadsheetAnalyticsSideBar;
