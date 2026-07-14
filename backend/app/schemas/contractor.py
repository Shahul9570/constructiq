from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class ContractorBase(BaseModel):
    name: str
    company_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    trade: Optional[str] = None
    team_size: int = 1
    contract_amount: float = 0.0
    user_id: Optional[int] = None

class ContractorCreate(ContractorBase):
    pass

class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    trade: Optional[str] = None
    team_size: Optional[int] = None
    contract_amount: Optional[float] = None
    is_active: Optional[bool] = None
    user_id: Optional[int] = None

class ContractorPaymentBase(BaseModel):
    amount: float
    payment_date: date
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

class ContractorPaymentCreate(ContractorPaymentBase):
    pass

class ContractorPaymentResponse(ContractorPaymentBase):
    id: int
    contractor_id: int
    status: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}

class ContractorResponse(ContractorBase):
    id: int
    project_id: int
    paid_amount: float
    pending_amount: float
    rating: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    payments: list[ContractorPaymentResponse] = []

    model_config = {"from_attributes": True}


class ContractorList(BaseModel):
    items: list[ContractorResponse]
    total: int
    page: int
    size: int
