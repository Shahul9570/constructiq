from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class DailyWorkLog(Base):
    __tablename__ = "daily_work_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("project_blocks.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("project_tasks.id"), nullable=True)
    date = Column(Date, nullable=False)
    area = Column(String(255), nullable=False)
    activity = Column(String(255), nullable=False)
    planned_quantity = Column(Float, default=0.0)
    completed_quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="sq.ft")
    labour_hours = Column(Float, default=0.0)
    workers_count = Column(Integer, default=0)
    remarks = Column(Text)
    weather_condition = Column(String(100))
    
    verification_status = Column(String(50), default="pending")
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_remarks = Column(Text)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    creator = relationship("User", foreign_keys=[created_by])
    verified_by = relationship("User", foreign_keys=[verified_by_id])

    def __repr__(self):
        return f"<DailyWorkLog {self.date} - {self.activity}>"
