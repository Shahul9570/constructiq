from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SAEnum,
    ForeignKey, Text, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class ProjectType(str, enum.Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    OTHER = "other"


class ProjectBlockType(str, enum.Enum):
    BUILDING = "building"
    FOUNDATION = "foundation"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    STRUCTURE = "structure"
    OTHER = "other"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=True)  # Kept for legacy/fallback
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    location = Column(Text, nullable=False)
    description = Column(Text)
    start_date = Column(DateTime, nullable=False)
    expected_end_date = Column(DateTime, nullable=False)
    actual_end_date = Column(DateTime)
    budget = Column(Float, default=0.0)
    status = Column(SAEnum(ProjectStatus), default=ProjectStatus.PLANNING)
    project_type = Column(String(50), default=ProjectType.OTHER.value)
    progress_percentage = Column(Float, default=0.0)
    is_archived = Column(Boolean, default=False)
    model_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    blocks = relationship("ProjectBlock", back_populates="project", cascade="all, delete-orphan")
    structures = relationship("ProjectStructure", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    client = relationship("User", foreign_keys=[client_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    equipment_list = relationship("Equipment", back_populates="project")

    def __repr__(self):
        return f"<Project {self.name}>"


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_in_project = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="members")
    user = relationship("User")


class ProjectBlock(Base):
    __tablename__ = "project_blocks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    block_type = Column(SAEnum(ProjectBlockType), default=ProjectBlockType.BUILDING)
    description = Column(Text)
    progress_percentage = Column(Float, default=0.0)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="blocks")

    def __repr__(self):
        return f"<ProjectBlock {self.name}>"


class ProjectStructure(Base):
    __tablename__ = "project_structures"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("project_structures.id"), nullable=True)
    name = Column(String(255), nullable=False)
    level = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    mesh_node_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="structures")
    children = relationship("ProjectStructure", backref="parent", remote_side=[id])

    def __repr__(self):
        return f"<ProjectStructure {self.name}>"
