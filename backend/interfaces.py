from typing import Protocol, List, Tuple, Dict, Any, Optional
from langchain_core.documents import Document

class IChatRepository(Protocol):
    async def init_db(self) -> None:
        """Initializes database schema."""
        ...

    async def create_chat(self, title: str) -> str:
        """Creates a new chat session and returns its ID."""
        ...

    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves details of a chat session."""
        ...

    async def load_chats(self) -> List[Dict[str, Any]]:
        """Loads all chat sessions."""
        ...

    async def delete_chat(self, chat_id: str) -> None:
        """Deletes a chat session and all its messages."""
        ...

    async def save_message(self, chat_id: str, role: str, content: str, token_count: Optional[int]) -> None:
        """Saves a message to the database."""
        ...

    async def load_messages(self, chat_id: str) -> List[Dict[str, Any]]:
        """Loads the message history for a chat session."""
        ...


class IVectorStoreService(Protocol):
    async def create_index(self, chat_id: str, chunks: List[str]) -> None:
        """Saves text chunks as embeddings in a separate namespace."""
        ...

    async def similarity_search(self, chat_id: str, query: str, k: int = 3) -> List[Tuple[Document, float]]:
        """Searches the namespace for query and returns list of (Document, score) tuples."""
        ...

    async def delete_index(self, chat_id: str) -> None:
        """Deletes all embeddings in the given namespace."""
        ...


class ILLMService(Protocol):
    async def generate_response(self, context: str, question: str, history: str, chat_id: str) -> Dict[str, Any]:
        """Generates an answer based on prompt context, question, and history."""
        ...


class ISearchService(Protocol):
    async def web_search(self, query: str) -> str:
        """Searches the web and returns a concatenated block of result content."""
        ...
