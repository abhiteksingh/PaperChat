from pydantic import BaseModel

from typing import Optional

class Request_Format(BaseModel):
    chat_id : str
    question : str
    page: Optional[int] = None
    workspace_type: Optional[str] = None

class Request_Delete(BaseModel):
     chat_id : str

class Request_Messages(BaseModel):
     chat_id : str
