from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    photo_url: Optional[str] = ""
    user_name: Optional[str] = ""
    is_online: bool = False
    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    user_name: Optional[str] = Field(default=None, min_length=1, max_length=30)
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)


class UserStatusUpdate(BaseModel):
    is_online: bool
