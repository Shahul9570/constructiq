from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.models.notification import NotificationType

class NotificationBase(BaseModel):
    type: NotificationType
    message: str
    is_read: bool = False
    invoice_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    unread_count: int
