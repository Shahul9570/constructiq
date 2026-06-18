from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SAEnum,
    ForeignKey, Text, Date, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    company_name = Column(String(255))
    phone = Column(String(20), nullable=False)
    email = Column(String(255))
    address = Column(Text)
    trade = Column(String(100))
    team_size = Column(Integer, default=1)
    contract_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    pending_amount = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    payments = relationship("ContractorPayment", back_populates="contractor", cascade="all, delete-orphan")
    labour_summaries = relationship("DailyLabourSummary", backref="contractor_ref", foreign_keys="DailyLabourSummary.contractor_id")

    def __repr__(self):
        return f"<Contractor {self.name}>"


class ContractorPayment(Base):
    __tablename__ = "contractor_payments"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String(50))
    transaction_id = Column(String(100))
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contractor = relationship("Contractor", back_populates="payments")
