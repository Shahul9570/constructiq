from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    caption = Column(Text)
    area = Column(String(255))
    activity = Column(String(255))
    photo_date = Column(Date)
    file_size = Column(Integer)
    file_type = Column(String(50))
    is_video = Column(Boolean, default=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Photo {self.id} - {self.area}>"
