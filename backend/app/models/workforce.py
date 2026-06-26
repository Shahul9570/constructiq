from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SAEnum,
    ForeignKey, Text, Date
)
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class TradeType(str, enum.Enum):
    MASON = "mason"
    CARPENTER = "carpenter"
    ELECTRICIAN = "electrician"
    PLUMBER = "plumber"
    PAINTER = "painter"
    HELPER = "helper"
    OPERATOR = "operator"
    SUPERVISOR = "supervisor"
    OTHER = "other"


class DailyLabourSummary(Base):
    __tablename__ = "daily_labour_summary"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    date = Column(Date, nullable=False)
    trade = Column(String(50), nullable=False)
    workers_count = Column(Integer, default=0)
    daily_rate = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=True)
    remarks = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    verification_status = Column(String(50), default="pending")
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self):
        return f"<DailyLabourSummary {self.date} - {self.trade} - {self.workers_count}>"
