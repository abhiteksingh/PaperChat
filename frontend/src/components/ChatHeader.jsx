
function ChatHeader(){
    return (
        <div className="border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-full mx-auto px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-wide">
          PDF Chatbot
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Upload a PDF and chat with its contents
        </p>
      </div>
    </div>
    )
}

export default ChatHeader