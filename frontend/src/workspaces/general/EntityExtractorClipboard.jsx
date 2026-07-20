import { useState } from 'react';

function EntityExtractorClipboard({ chatId, activeChat, clipboardItems, setClipboardItems }) {
  const [activeTab, setActiveTab] = useState("clipboard"); // "clipboard" | "entities"

  const isProcessing = activeChat?.status === "processing";

  let entities = { dates: [], names: [], definitions: [] };
  if (activeChat && activeChat.analysis_results_json) {
    try {
      const results = JSON.parse(activeChat.analysis_results_json);
      if (results.extracted_entities) {
        entities = {
          dates: results.extracted_entities.dates || [],
          names: results.extracted_entities.names || [],
          definitions: results.extracted_entities.definitions || []
        };
      }
    } catch (e) {
      console.error("Failed to parse analysis results json", e);
    }
  }

  const handleCopyClipboardReport = () => {
    if (clipboardItems.length === 0) return;
    
    // Format a beautiful Markdown compilation report
    const header = `### 📋 General Synthesis Clipboard Report\nCompiled reference segments from uploaded document(s):\n\n---\n\n`;
    const body = clipboardItems.map((item, idx) => (
      `**[Snippet #${idx + 1}]** (Source: ${item.filename ? `${item.filename}, ` : ""}Page ${item.page})\n> "${item.text}"`
    )).join("\n\n---\n\n");
    
    navigator.clipboard.writeText(header + body);
    alert("Clipboard compilation report copied to system clipboard!");
  };

  const handleRemoveSnippet = (idx) => {
    setClipboardItems(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-[300px] bg-[#161616] border-l border-[#2A2A2A] h-full flex flex-col overflow-hidden shrink-0 select-none text-[10px] font-mono">
      {/* Header Tabs */}
      <div className="flex border-b border-[#2A2A2A] bg-[#0F0F0F] shrink-0">
        <button
          onClick={() => setActiveTab("clipboard")}
          className={`flex-1 py-3 text-center font-bold tracking-wider uppercase border-b-2 transition ${
            activeTab === "clipboard" ? "border-[#4C8DFF] text-[#4C8DFF]" : "border-transparent text-[#9A9A9A] hover:text-white"
          }`}
        >
          📋 Clipboard ({clipboardItems.length})
        </button>
        <button
          onClick={() => setActiveTab("entities")}
          className={`flex-1 py-3 text-center font-bold tracking-wider uppercase border-b-2 transition ${
            activeTab === "entities" ? "border-[#4C8DFF] text-[#4C8DFF]" : "border-transparent text-[#9A9A9A] hover:text-white"
          }`}
        >
          🔍 Key Terms
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left" style={{ scrollbarWidth: 'thin' }}>
        {activeTab === "clipboard" ? (
          <div className="space-y-3.5 h-full flex flex-col">
            <div className="flex justify-between items-center shrink-0">
              <span className="text-[#9A9A9A] font-bold uppercase tracking-wider text-[9px]">Pinned Snippets</span>
              {clipboardItems.length > 0 && (
                <button
                  onClick={handleCopyClipboardReport}
                  className="bg-[#4C8DFF] hover:bg-[#6FA2FF] text-white text-[8px] font-bold px-2 py-1 rounded transition cursor-pointer uppercase"
                >
                  Copy Report
                </button>
              )}
            </div>

            {clipboardItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[#9A9A9A] leading-relaxed">
                <span>No pinned snippets yet.</span>
                <span className="text-[9px] mt-1">Click "Pin to Clipboard" on citations or chat reference excerpts.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {clipboardItems.map((item, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] p-3 rounded-xl flex flex-col gap-2 relative group hover:border-[#4C8DFF]/30 transition">
                    <div className="flex justify-between items-center text-[8px] text-[#9A9A9A] border-b border-[#2A2A2A] pb-1">
                      <span className="truncate max-w-[70%] font-semibold">#{idx+1} {item.filename?.split('/').pop().split('\\').pop()}</span>
                      <span className="text-[#4C8DFF] font-bold">p.{item.page}</span>
                    </div>
                    <p className="text-zinc-300 italic leading-relaxed">"{item.text}"</p>
                    <button
                      onClick={() => handleRemoveSnippet(idx)}
                      className="absolute top-2 right-2 text-[#9A9A9A] hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer font-sans"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[#9A9A9A] font-bold uppercase tracking-wider text-[9px] mb-1">Document Entities</div>
            
            {isProcessing ? (
              <div className="text-center py-12 text-[#9A9A9A] animate-pulse">Extracting terms in background...</div>
            ) : (entities.dates.length === 0 && entities.names.length === 0 && entities.definitions.length === 0) ? (
              <div className="text-[#9A9A9A] py-12 text-center">No key entities found.</div>
            ) : (
              <>
                {entities.definitions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[#3ECF8E] text-[8px] font-bold uppercase tracking-widest">Definitions & Terms</div>
                    <div className="space-y-1.5">
                      {entities.definitions.map((def, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] p-2.5 rounded-lg text-zinc-300 leading-normal">
                          {def}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entities.dates.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[#FFB04C] text-[8px] font-bold uppercase tracking-widest">Key Dates</div>
                    <div className="space-y-1.5">
                      {entities.dates.map((date, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] p-2.5 rounded-lg text-zinc-300 leading-normal">
                          📅 {date}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entities.names.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[#4C8DFF] text-[8px] font-bold uppercase tracking-widest">Organizations & Names</div>
                    <div className="space-y-1.5">
                      {entities.names.map((name, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] p-2.5 rounded-lg text-zinc-300 leading-normal">
                          🏢 {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EntityExtractorClipboard;
