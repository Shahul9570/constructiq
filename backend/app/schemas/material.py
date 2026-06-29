from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class MaterialBase(BaseModel):
    name: str
    material_type: str = "other"
    unit: str = "numbers"
    current_stock: float = 0.0
    reorder_level: float = 0.0
    unit_price: float = 0.0
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    material_type: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[float] = None
    reorder_level: Optional[float] = None
    unit_price: Optional[float] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    is_active: Optional[bool] = None


class MaterialArrivalBase(BaseModel):
    quantity: float
    supplier_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_amount: float = 0.0
    paid_amount: float = 0.0
    notes: Optional[str] = None

class MaterialArrivalCreate(MaterialArrivalBase):
    arrival_date: date

class MaterialArrivalUpdate(BaseModel):
    paid_amount: Optional[float] = None
    invoice_amount: Optional[float] = None
    notes: Optional[str] = None

class MaterialPaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class MaterialPaymentCreate(MaterialPaymentBase):
    payment_date: date


class MaterialPaymentResponse(MaterialPaymentBase):
    id: int
    arrival_id: int
    payment_date: date
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MaterialArrivalResponse(MaterialArrivalBase):
    id: int
    material_id: int
    arrival_date: date
    received_by: int
    created_at: datetime
    payments: list[MaterialPaymentResponse] = []

    model_config = {"from_attributes": True}


class MaterialConsumptionBase(BaseModel):
    quantity: float
    area: Optional[str] = None
    work_area: Optional[str] = None
    notes: Optional[str] = None


class MaterialConsumptionCreate(MaterialConsumptionBase):
    consumption_date: date


class MaterialConsumptionResponse(MaterialConsumptionBase):
    id: int
    material_id: int
    consumption_date: date
    used_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MaterialResponse(MaterialBase):
    id: int
    project_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    arrivals: list[MaterialArrivalResponse] = []
    consumptions: list[MaterialConsumptionResponse] = []
    is_low_stock: bool = False

    model_config = {"from_attributes": True}


class MaterialList(BaseModel):
    items: list[MaterialResponse]
    total: int
    page: int
    size: int
