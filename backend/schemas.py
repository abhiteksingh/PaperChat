from pydantic import BaseModel

class Request_Format(BaseModel):
    chat_id : str
    question : str

class Request_Delete(BaseModel):
     chat_id : str

class Request_Messages(BaseModel):
     chat_id : str
