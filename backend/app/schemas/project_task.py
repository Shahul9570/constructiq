from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProjectTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    weight_percentage: float = 0.0


class ProjectTaskCreate(ProjectTaskBase):
    pass


class ProjectTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight_percentage: Optional[float] = None


class ProjectTaskResponse(ProjectTaskBase):
    id: int
    project_id: int
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
