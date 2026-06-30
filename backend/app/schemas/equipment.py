from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class EquipmentUsageBase(BaseModel):
    hours_used: float = 0.0
    fuel_used: float = 0.0
    operator_name: Optional[str] = None
    work_description: Optional[str] = None


class EquipmentUsageCreate(EquipmentUsageBase):
    date: date


class EquipmentUsageResponse(EquipmentUsageBase):
    id: int
    equipment_id: int
    project_id: int
    date: date
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EquipmentBase(BaseModel):
    name: str
    equipment_type: str = "other"
    ownership_type: str = "owned"
    vendor_name: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: float = 0.0
    hourly_rate: float = 0.0
    maintenance_interval_days: int = 30
    operator_name: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    project_id: Optional[int] = None


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    equipment_type: Optional[str] = None
    ownership_type: Optional[str] = None
    vendor_name: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None
    project_id: Optional[int] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = None
    hourly_rate: Optional[float] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    maintenance_interval_days: Optional[int] = None
    operator_name: Optional[str] = None
    is_active: Optional[bool] = None


class EquipmentResponse(EquipmentBase):
    id: int
    company_id: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    status: str
    total_hours_used: float
    total_fuel_used: float
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    usage_records: list[EquipmentUsageResponse] = []

    model_config = {"from_attributes": True}


class EquipmentList(BaseModel):
    items: list[EquipmentResponse]
    total: int
    page: int
    size: int
