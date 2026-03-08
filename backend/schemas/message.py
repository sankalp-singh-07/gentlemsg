from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    type: str = Field(default="text", pattern="^(text|image|video|document)$")


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    type: str
    sent_at: datetime

    class Config:
        from_attributes = True


class MediaResponse(BaseModel):
    url: str
    content_type: str
    filename: str
