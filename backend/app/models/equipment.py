from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SAEnum,
    ForeignKey, Text, Date, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class EquipmentType(str, enum.Enum):
    EXCAVATOR = "excavator"
    CRANE = "crane"
    BULLDOZER = "bulldozer"
    CONCRETE_MIXER = "concrete_mixer"
    DUMP_TRUCK = "dumb_truck"
    LOADER = "loader"
    GENERATOR = "generator"
    VIBRATOR = "vibrator"
    PUMP = "pump"
    OTHER = "other"


class EquipmentStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    UNDER_MAINTENANCE = "under_maintenance"
    OUT_OF_SERVICE = "out_of_service"


class OwnershipType(str, enum.Enum):
    OWNED = "owned"
    RENTED = "rented"



class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    name = Column(String(255), nullable=False)
    equipment_type = Column(SAEnum(EquipmentType), nullable=False)
    model_number = Column(String(100))
    serial_number = Column(String(100))
    status = Column(SAEnum(EquipmentStatus), default=EquipmentStatus.AVAILABLE)
    ownership_type = Column(SAEnum(OwnershipType), default=OwnershipType.OWNED)
    vendor_name = Column(String(255), nullable=True)
    purchase_date = Column(Date)
    purchase_cost = Column(Float, default=0.0)
    hourly_rate = Column(Float, default=0.0)
    total_hours_used = Column(Float, default=0.0)
    total_fuel_used = Column(Float, default=0.0)
    last_maintenance_date = Column(Date)
    next_maintenance_date = Column(Date)
    maintenance_interval_days = Column(Integer, default=30)
    operator_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    usage_records = relationship("EquipmentUsage", back_populates="equipment", cascade="all, delete-orphan")
    project = relationship("Project", back_populates="equipment_list")

    def __repr__(self):
        return f"<Equipment {self.name} ({self.equipment_type.value})>"


class EquipmentUsage(Base):
    __tablename__ = "equipment_usage"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    date = Column(Date, nullable=False)
    hours_used = Column(Float, default=0.0)
    fuel_used = Column(Float, default=0.0)
    operator_name = Column(String(255))
    work_description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipment = relationship("Equipment", back_populates="usage_records")
