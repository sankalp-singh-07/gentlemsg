from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatCreate(BaseModel):
    receiver_id: str = Field(..., min_length=1)


class ChatListItem(BaseModel):
    chat_id: str
    receiver_id: str
    receiver_name: str
    receiver_photo_url: Optional[str] = ""
    receiver_user_name: Optional[str] = ""
    receiver_is_online: bool = False
    last_message: str = "Start Conversation"
    last_message_type: str = "text"
    sent_at: Optional[datetime] = None
    is_seen: bool = True


class ChatResponse(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    created_at: datetime

    class Config:
        from_attributes = True
