from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.workforce import TradeType


class DailyLabourSummaryBase(BaseModel):
    date: date
    trade: str
    workers_count: int = Field(..., ge=0)
    daily_rate: float = Field(..., ge=0.0)
    paid_amount: float = Field(0.0, ge=0.0)
    contractor_id: Optional[int] = None
    remarks: Optional[str] = None


class DailyLabourSummaryCreate(DailyLabourSummaryBase):
    pass


class DailyLabourSummaryUpdate(BaseModel):
    date: Optional[date] = None
    trade: Optional[str] = None
    workers_count: Optional[int] = Field(None, ge=0)
    daily_rate: Optional[float] = Field(None, ge=0.0)
    paid_amount: Optional[float] = Field(None, ge=0.0)
    contractor_id: Optional[int] = None
    remarks: Optional[str] = None


class VerifyLabourRequest(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    remarks: Optional[str] = None


class DailyLabourSummaryResponse(DailyLabourSummaryBase):
    id: int
    project_id: int
    created_by: int
    verification_status: str
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verification_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DailyLabourSummaryList(BaseModel):
    items: list[DailyLabourSummaryResponse]
    total: int
    page: int
    size: int
