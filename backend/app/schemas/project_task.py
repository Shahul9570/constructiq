from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProjectTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    weight_percentage: float = 0.0
    status: Optional[str] = "pending"
    assigned_to_id: Optional[int] = None


class ProjectTaskCreate(ProjectTaskBase):
    pass


class ProjectTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight_percentage: Optional[float] = None
    progress_percentage: Optional[float] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None


class ProjectTaskResponse(ProjectTaskBase):
    id: int
    project_id: int
    progress_percentage: float
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
