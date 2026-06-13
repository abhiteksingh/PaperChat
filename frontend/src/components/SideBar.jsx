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
                        className="
                            flex-1
                            text-left
                            px-4
                            py-3
                            rounded-xl
                            bg-zinc-800
                            hover:bg-zinc-700
                        "
                    >
                        {chat.title}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDelete(chat.chat_id)}
                        className="
                            px-2
                            py-2
                            rounded-lg
                            bg-blue-600
                            hover:bg-blue-500
                        "
                    >
                        <strong> : </strong>
                    </button>
                </div>
                ))}

            </div>

        </div>
    );
}

export default SideBar;
