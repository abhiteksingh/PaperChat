from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional
import uuid

from interfaces import IChatRepository
from models import Chat, Message

class SQLAlchemyChatRepository(IChatRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def init_db(self) -> None:
        # Schema initialization is handled globally in database.py
        pass

    async def create_chat(self, title: str) -> str:
        chat_id = str(uuid.uuid4())
        new_chat = Chat(id=chat_id, title=title)
        self.session.add(new_chat)
        await self.session.commit()
        return chat_id

    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        stmt = select(Chat).where(Chat.id == chat_id)
        result = await self.session.execute(stmt)
        chat = result.scalar_one_or_none()
        if not chat:
            return None
        return {"chat_id": chat.id, "title": chat.title}

    async def load_chats(self) -> List[Dict[str, Any]]:
        # Order by chat creation or simple SELECT
        stmt = select(Chat)
        result = await self.session.execute(stmt)
        chats = result.scalars().all()
        return [{"chat_id": chat.id, "title": chat.title} for chat in chats]

    async def delete_chat(self, chat_id: str) -> None:
        stmt = select(Chat).where(Chat.id == chat_id)
        result = await self.session.execute(stmt)
        chat = result.scalar_one_or_none()
        if chat:
            await self.session.delete(chat)
            await self.session.commit()

    async def save_message(self, chat_id: str, role: str, content: str, token_count: Optional[int]) -> None:
        new_message = Message(
            chat_id=chat_id,
            role=role,
            content=content,
            token_count=token_count
        )
        self.session.add(new_message)
        await self.session.commit()

    async def load_messages(self, chat_id: str) -> List[Dict[str, Any]]:
        stmt = select(Message).where(Message.chat_id == chat_id).order_by(Message.id)
        result = await self.session.execute(stmt)
        messages = result.scalars().all()
        return [
            {
                "role": msg.role,
                "content": msg.content,
                "token_count": msg.token_count
            }
            for msg in messages
        ]
