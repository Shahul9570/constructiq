from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class CostRecordBase(BaseModel):
    category: str
    description: Optional[str] = None
    amount: float
    date: date
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class CostRecordCreate(CostRecordBase):
    pass


class CostRecordResponse(CostRecordBase):
    id: int
    project_id: int
    created_by: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceBase(BaseModel):
    invoice_number: str
    invoice_type: str
    vendor_name: Optional[str] = None
    amount: float
    tax_amount: float = 0.0
    issue_date: date
    due_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    project_id: int


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class SubmitPaymentRequest(BaseModel):
    payment_method: str
    amount: float
    notes: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    amount_received: float


class InvoiceResponse(InvoiceBase):
    id: int
    project_id: int
    total_amount: float
    amount_paid: float
    pending_amount: float = 0.0
    status: str
    paid_date: Optional[date] = None
    file_url: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CostSummary(BaseModel):
    date: date
    total_labour_cost: float = 0.0
    total_material_cost: float = 0.0
    total_equipment_cost: float = 0.0
    total_contractor_cost: float = 0.0
    total_overhead_cost: float = 0.0
    total_cost: float = 0.0
    daily_budget: float = 0.0
    variance: float = 0.0


class BudgetTracking(BaseModel):
    project_id: int
    total_budget: float
    total_spent: float
    remaining: float
    utilization_percentage: float
    is_over_budget: bool
    category_breakdown: list[dict]
