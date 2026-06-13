function MessageBubble({ role, content, sources = [] , token_count}) {
    return (
        <div
            className={
                role === "user"
                    ? "flex flex-col items-end"
                    : "flex flex-col items-start"
            }
        >
            <div
                className={
                    role === "user"
                        ? `
                            max-w-[75%]
                            rounded-3xl
                            px-5
                            py-4
                            bg-white
                            text-black
                            shadow-lg
                        `
                        : `
                            max-w-[75%]
                            rounded-3xl
                            px-5
                            py-4
                            bg-zinc-900
                            border
                            border-white/20
                            shadow-lg
                        `
                }
            >
                {content}
            </div>

            {role === "assistant" && (
                <div className="mt-1 text-xs text-zinc-400">
                    {sources?.includes("pdf") && <span>📄 PDF</span>}
                    {sources?.includes("web") && <span>🌐 Web</span>}

                    {token_count && (
                    <span>• {token_count.toLocaleString()} tokens</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default MessageBubble;