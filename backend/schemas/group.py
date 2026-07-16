from pydantic import BaseModel, Field
from typing import Optional, List


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: Optional[str] = Field(default="", max_length=500)
    member_ids: List[str] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)


class GroupMemberAdd(BaseModel):
    user_ids: List[str] = Field(..., min_length=1)


class GroupMemberRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|member)$")


class GroupMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    type: str = Field(default="text", pattern="^(text|image|video|document)$")
    reply_to_id: Optional[str] = None


class GroupMessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
