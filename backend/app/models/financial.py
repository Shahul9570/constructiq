from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SAEnum,
    ForeignKey, Text, Date, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class CostCategory(str, enum.Enum):
    LABOUR = "labour"
    MATERIAL = "material"
    EQUIPMENT = "equipment"
    CONTRACTOR = "contractor"
    OVERHEAD = "overhead"
    OTHER = "other"


class InvoiceType(str, enum.Enum):
    MATERIAL = "MATERIAL"
    CONTRACTOR = "CONTRACTOR"
    EQUIPMENT = "EQUIPMENT"
    LABOUR = "LABOUR"
    CLIENT = "CLIENT"
    OTHER = "OTHER"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class CostRecord(Base):
    __tablename__ = "cost_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    category = Column(SAEnum(CostCategory), nullable=False)
    description = Column(Text)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    reference_type = Column(String(50))
    reference_id = Column(Integer)
    paid_amount = Column(Float, default=0.0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="approved")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CostRecord {self.date} - {self.category.value}: {self.amount}>"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    invoice_type = Column(SAEnum(InvoiceType), nullable=False)
    vendor_name = Column(String(255))
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    pending_amount = Column(Float, default=0.0)
    status = Column(SAEnum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date)
    paid_date = Column(Date)
    payment_method = Column(String(50))
    notes = Column(Text)
    file_url = Column(String(500))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self):
        return f"<Invoice {self.invoice_number}>"
