from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.utils.enums import NotificationType

class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
