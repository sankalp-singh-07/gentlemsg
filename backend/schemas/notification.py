from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    from_user_id: str
    type: str
    created_at: datetime
    from_user_name: Optional[str] = None
    from_user_photo_url: Optional[str] = None
    from_user_email: Optional[str] = None

    class Config:
        from_attributes = True
