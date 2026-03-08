from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FriendRequestCreate(BaseModel):
    receiver_id: str = Field(..., min_length=1)


class FriendRequestResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    status: str
    created_at: datetime
    sender_name: Optional[str] = None
    sender_photo_url: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class FriendResponse(BaseModel):
    id: str
    name: str
    email: str
    photo_url: Optional[str] = ""
    user_name: Optional[str] = ""

    class Config:
        from_attributes = True


class BlockRequest(BaseModel):
    chat_id: str = Field(..., min_length=1)
