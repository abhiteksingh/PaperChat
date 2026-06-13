

function InputArea({handleChatSubmit,chatLoading,question,setQuestion}){
    return (
        <form onSubmit={handleChatSubmit}>
            <div
              className="
                flex
                items-center
                gap-3
                border
                border-white/15
                bg-white/[0.04]
                backdrop-blur-xl
                rounded-3xl
                p-3
                hide-scrollbar
              "
            >
              <textarea
                placeholder="Ask a question about the PDF..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e);
                  }
                }}
                disabled={chatLoading}
                className="
                  flex-1
                  bg-transparent
                  outline-none
                  resize-none
                  text-white
                  placeholder:text-zinc-500
                  px-3
                  hide-scrollbar
                "
              />

              <button
                type="submit"
                disabled={chatLoading}
                className="
                  px-6
                  py-3
                  rounded-2xl
                  bg-white
                  text-black
                  font-medium
                  hover:scale-105
                  transition
                  disabled:opacity-50
                "
              >
                Send
              </button>

              
            </div>
          </form>
    )
}

export default InputArea