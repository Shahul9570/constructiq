from sqlalchemy import Column, String, LargeBinary, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class FileBlob(Base):
    __tablename__ = "file_blobs"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    content_type = Column(String, nullable=True)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
