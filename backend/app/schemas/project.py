from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class ProjectBlockBase(BaseModel):
    name: str
    block_type: str = "building"
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectBlockCreate(ProjectBlockBase):
    pass


class ProjectBlockResponse(ProjectBlockBase):
    id: int
    project_id: int
    progress_percentage: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectStructureBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    level: int = 0
    sort_order: int = 0


class ProjectStructureCreate(ProjectStructureBase):
    pass


class ProjectStructureResponse(ProjectStructureBase):
    id: int
    project_id: int
    created_at: datetime
    children: list["ProjectStructureResponse"] = []

    model_config = {"from_attributes": True}


class ProjectBase(BaseModel):
    name: str
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    location: str
    description: Optional[str] = None
    start_date: date
    expected_end_date: date
    budget: float = 0.0
    project_type: str = "other"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    location: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    budget: Optional[float] = None
    status: Optional[str] = None
    project_type: Optional[str] = None
    progress_percentage: Optional[float] = None


class ProjectResponse(ProjectBase):
    id: int
    status: str
    progress_percentage: float
    is_archived: bool
    actual_end_date: Optional[date] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    blocks: list[ProjectBlockResponse] = []
    structures: list[ProjectStructureResponse] = []

    model_config = {"from_attributes": True}


class ProjectList(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    size: int
