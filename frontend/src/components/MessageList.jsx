import MessageBubble from "./MessageBubble";

function MessageList({messages , chatLoading}){
    return (
        <div
            className="
              flex-1
              overflow-y-auto
              space-y-6
              mb-6
              rounded-3xl
              border
              border-white/10
              bg-white/[0.03]
              backdrop-blur-xl
              p-6
              hide-scrollbar
            "
          >

            {messages.map((message, index) => (
              <MessageBubble
                key = {index}
                role = {message.role}
                content = {message.content}
                sources= {message.sources}
                token_count = {message.token_count}
              />
    
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div
                  className="
                    rounded-3xl
                    px-5
                    py-4
                    bg-zinc-900
                    border
                    border-white/20
                  "
                >
                  Thinking...
                </div>
              </div>
            )}

          </div>
    )
}

export default MessageList