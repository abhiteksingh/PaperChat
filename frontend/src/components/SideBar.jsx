import {useState , useEffect} from 'react'

function SideBar({chats,chatId,setChatId,setChats,setMessages}){
    useEffect(() => {
        async function fetchChats(){
            const response = await fetch("http://127.0.0.1:8000/chats")

            const data = await response.json()

            setChats(data.chats)
        }

        fetchChats()
    },[])

    const handleChatFunction = async (chatId) => {
    try {
        setChatId(chatId);

        const response = await fetch(
            "http://127.0.0.1:8000/messages",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: chatId
                })
            }
        );

        const data = await response.json();

        setMessages(data.messages);
    }
    catch(error){
        console.error(error);
    }
}

    const handleNewChat = async () => {
        try {
            setChatId("")
            setMessages([])
        }

        catch (error){
            console.error(error)
        }
    }

    const handleDelete = async (chatIdToDelete) => {
        
        try{

            await fetch("http://127.0.0.1:8000/delete",{
                method : "DELETE",
                headers : {
                    "Content-Type" : "application/json"
                    },
                body: JSON.stringify({
                    chat_id : chatIdToDelete,
                })
                }
            )

            setChats(prev => 
                prev.filter(chat => chat.chat_id != chatIdToDelete)
            )

            if(chatId == chatIdToDelete){
                setChatId("")
                setMessages([])
            }
        }
        catch (error){
            console.error(error)
        }
    }

    return (
        <div className="h-screen w-72 bg-zinc-900 border-r border-white/10 p-4 flex flex-col">

            <h2 className="text-xl font-semibold mb-4">
                Chats
            </h2>

            <div className="mb-4">
            <button
                type = "button"
                onClick={handleNewChat}
                className="
                    w-full
                    px-4
                    py-3
                    rounded-xl
                    bg-blue-600
                    hover:bg-blue-500
                    transition
                "
            >
                + New Chat
            </button>
        </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">

                {chats.map((chat) => (
                    <div
                    key={chat.chat_id}
                    className="
                        flex
                        items-center
                        gap-2
                    "
                >
                    <button
                        type="button"
                        onClick={() => handleChatFunction(chat.chat_id)}
                        className={`
                            flex-1
                            text-left
                            px-4
                            py-3
                            rounded-xl
                            transition-all
                            duration-200
                            ${chat.chat_id === chatId
                                ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}
                        `}
                    >
                        {chat.title}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDelete(chat.chat_id)}
                        className="
                            px-3
                            py-3
                            rounded-xl
                            bg-zinc-800
                            hover:bg-red-950/40
                            hover:border-red-500/30
                            border
                            border-transparent
                            transition
                            text-zinc-400
                            hover:text-red-400
                            flex
                            items-center
                            justify-center
                        "
                        title="Delete chat"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                ))}

            </div>

        </div>
    );
}

export default SideBar;
