function MessageBubble({ role, content, sources = [], token_count, citations = [], onSelectCitation, isLight }) {
  const hasCitations = role === "assistant" && citations && citations.length > 0;

  return (
    <div className={`w-full flex flex-col ${role === "user" ? "items-end" : "items-start"} animate-fade-in`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
          role === "user"
            ? "bg-[#4C8DFF] text-white shadow-md font-body"
            : (isLight 
                ? "bg-slate-50 border border-slate-200 text-slate-850 font-body shadow-sm"
                : "bg-[#161616] border border-[#2A2A2A] text-[#E8E8E8] font-body")
        }`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        
        {hasCitations && (
          <div className={`mt-3 pt-2.5 border-t flex flex-wrap gap-1.5 select-none ${isLight ? "border-slate-200" : "border-[#2A2A2A]/80"}`}>
            <span className={`text-[9px] font-mono self-center mr-1 ${isLight ? "text-slate-400" : "text-[#9A9A9A]"}`}>Citations:</span>
            {citations.map((cit, idx) => (
              <button
                key={idx}
                onClick={() => onSelectCitation && onSelectCitation(cit)}
                className="inline-flex items-center font-mono text-[9px] font-bold bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 text-[#4C8DFF] px-2 py-0.5 rounded hover:shadow-[0_0_10px_rgba(76,141,255,0.4)] active:scale-95 transition-all duration-150 cursor-pointer"
                title={`View Citation on Page ${cit.page} ${cit.filename ? `of ${cit.filename}` : ""}`}
              >
                {cit.filename ? `${cit.filename.split('/').pop().split('\\').pop()}, ` : ""}p.{cit.page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble;