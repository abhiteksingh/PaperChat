import {useState} from 'react';
import {useDropzone} from 'react-dropzone'
import ChatHeader from './ChatHeader';
import UploadZone from './UploadZone';
import PdfStatus from './PdfStatus';
import MessageList from './MessageList';
import InputArea from './InputArea';


function Chat({chatId,setChatId,messages,setMessages,chats,setChats}){

    const [question,setQuestion] = useState("")
    const [uploading , setUploading] = useState(false)
    const [chatLoading, setChatLoading] = useState(false)

    const onDrop = async (acceptedFiles) => {
        setUploading(true)

        try {

            const formData = new FormData()

            acceptedFiles.forEach((file) => {
                formData.append("files",file)
            })

            const response = await fetch("http://127.0.0.1:8000/upload",{
                method : "POST",
                body : formData
            })

            const data = await response.json()

            setChatId(data.chat_id)

            setMessages([])

            setChats(prev => [
                {
                    chat_id: data.chat_id,
                    title : data.title
                },
                ...prev
            ])
        }
        catch (error) {
            console.error(error)
        }

        finally{
            setUploading(false)
        }
    }

    const { getRootProps , getInputProps } = useDropzone({
        onDrop,
        accept : {
            "application/pdf" : [".pdf"]
        }
    })

    const handleChatSubmit = async (e) => {
      e.preventDefault() //stops page from refreshing
        setChatLoading(true)

        try{

            setMessages(prev => [
                ...prev,
                {
                    role:"user",
                    content : question
                }
            ])

            const response = await fetch("http://127.0.0.1:8000/chat",{
                method : "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify({
                    chat_id : chatId,
                    question : question,
                })
            })

            const data = await response.json()
            setMessages(prev => [
              ...prev,
              {
                role:"assistant",
                content : data.answer,
                sources : data.sources,
                token_count : data.token_count
              }
            ])

            setQuestion("")
        } catch (error) {
            console.error(error);
        } 
        finally {
            setChatLoading(false);
        }
    }

    return (
      <div className="h-full bg-zinc-950 text-white flex flex-col overflow-hidden">
        <ChatHeader />

    {/* Main Area */}
    <div className="flex-1 w-full w-full px-6 py-6 flex flex-col overflow-hidden">

      {!chatId && (
        <UploadZone 
          uploading={uploading}
          getInputProps={getInputProps}
          getRootProps={getRootProps}
        />
      )}

      {/* Chat Area */}
      {chatId && (
        <>
          <PdfStatus />

          {/* Messages */}
          <MessageList 
            messages = {messages}
            chatLoading = {chatLoading}
          />

          {/* Input Area */}
           <InputArea 
            handleChatSubmit={handleChatSubmit}
            question={question}
            setQuestion={setQuestion}
            chatLoading={chatLoading}
           />
        </>
      )}

    </div>
  </div>
    ) 
}

export default Chat