function MessageBubble({ role, content, sources = [], token_count, citations = [], onSelectCitation }) {
  return (
    <div className={`w-full flex flex-col ${role === "user" ? "items-end" : "items-start"} animate-fade-in`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
          role === "user"
            ? "bg-[#4C8DFF] text-white shadow-md font-body"
            : "bg-[#161616] border border-[#2A2A2A] text-[#E8E8E8] font-body"
        }`}
      >
        <div className="whitespace-pre-wrap">
          {content}
          
          {/* Inline Citation Chips */}
          {role === "assistant" && citations && citations.map((cit, idx) => (
            <button
              key={idx}
              onClick={() => onSelectCitation && onSelectCitation(cit)}
              className="inline-flex items-center font-mono text-[9px] font-bold bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 text-[#4C8DFF] px-1.5 py-0.5 rounded ml-1.5 hover:shadow-[0_0_10px_rgba(76,141,255,0.4)] active:scale-95 transition-all duration-150 cursor-pointer select-none align-middle"
              title={`View Citation on Page ${cit.page}`}
            >
              [p.{cit.page}]
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble;