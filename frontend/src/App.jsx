import Chat from "./components/Chat"
import SideBar from "./components/SideBar"
import { useState } from 'react'

function App(){

  const [messages,setMessages] = useState([])
  const [chatId,setChatId] = useState("");
  const [chats,setChats] = useState([])

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">

      <SideBar
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
      />

      <div className="flex-1 min-w-0 h-screen">
        <Chat
          chatId={chatId}
          setChatId={setChatId}
          messages={messages}
          setMessages={setMessages}
          chats={chats}
          setChats={setChats}
        />
      </div>

    </div>
  )
}


export default App;
