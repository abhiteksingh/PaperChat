import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function MessageList({ messages, chatLoading, isProcessing, isFailed, onSelectCitation }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  return (
    <div className="flex-1 overflow-y-auto space-y-6 mb-4 hide-scrollbar flex flex-col pr-1">
      
      {messages.length === 0 && isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4 select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 flex items-center justify-center text-xl shadow-inner animate-pulse">⏳</div>
          <div className="space-y-1.5">
            <h4 className="font-display text-base font-medium text-white">Reading & Indexing Document...</h4>
            <p className="text-xs text-[#9A9A9A] max-w-xs leading-relaxed">We are analyzing the PDF pages and saving embeddings to your vector store.</p>
          </div>
        </div>
      )}

      {messages.length === 0 && isFailed && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4 select-none">
          <div className="w-12 h-12 rounded-2xl bg-red-950/20 border border-red-500/20 flex items-center justify-center text-xl">⚠️</div>
          <div className="space-y-1.5">
            <h4 className="font-display text-base font-medium text-red-400">Failed to Index PDF</h4>
            <p className="text-xs text-[#9A9A9A] max-w-xs leading-relaxed">An error occurred while parsing this file. Please delete this session and try again.</p>
          </div>
        </div>
      )}

      {messages.length === 0 && !isProcessing && !isFailed && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center select-none space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-sm">💬</div>
          <h4 className="font-display text-sm font-medium text-white">Chat is ready</h4>
          <p className="text-xs text-[#9A9A9A]">Ask your files anything.</p>
        </div>
      )}

      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          role={message.role}
          content={message.content}
          sources={message.sources}
          token_count={message.token_count}
          citations={message.citations}
          onSelectCitation={onSelectCitation}
        />
      ))}

      {chatLoading && (
        <div className="flex justify-start">
          <div className="rounded-2xl px-4 py-3 bg-[#161616] border border-[#2A2A2A] text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

export default MessageList;