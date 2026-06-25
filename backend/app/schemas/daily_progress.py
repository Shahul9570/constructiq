from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class DailyWorkLogBase(BaseModel):
    date: date
    area: str
    activity: str
    task_id: Optional[int] = None
    block_id: Optional[int] = None
    planned_quantity: float = 0.0
    completed_quantity: float = 0.0
    unit: str = "sq.ft"
    labour_hours: float = 0.0
    workers_count: int = 0
    remarks: Optional[str] = None
    weather_condition: Optional[str] = None


class DailyWorkLogCreate(DailyWorkLogBase):
    block_id: Optional[int] = None
    date: date


class DailyWorkLogUpdate(BaseModel):
    area: Optional[str] = None
    activity: Optional[str] = None
    task_id: Optional[int] = None
    planned_quantity: Optional[float] = None
    completed_quantity: Optional[float] = None
    unit: Optional[str] = None
    labour_hours: Optional[float] = None
    workers_count: Optional[int] = None
    remarks: Optional[str] = None
    weather_condition: Optional[str] = None


class DailyWorkLogResponse(DailyWorkLogBase):
    id: int
    project_id: int
    block_id: Optional[int] = None
    date: date
    progress_percentage: float = 0.0
    created_by: int
    verification_status: str
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verification_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VerifyLogRequest(BaseModel):
    status: str  # 'approved' or 'rejected'
    remarks: Optional[str] = None


class DailyWorkLogList(BaseModel):
    items: list[DailyWorkLogResponse]
    total: int
    page: int
    size: int
