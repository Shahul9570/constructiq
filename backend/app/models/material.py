from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SAEnum,
    ForeignKey, Text, Date, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class MaterialType(str, enum.Enum):
    CEMENT = "cement"
    STEEL = "steel"
    SAND = "sand"
    AGGREGATE = "aggregate"
    BRICKS = "bricks"
    PAINT = "paint"
    TILES = "tiles"
    WOOD = "wood"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    OTHER = "other"


class UnitType(str, enum.Enum):
    KG = "kg"
    TONNE = "tonne"
    BAGS = "bags"
    CUBIC_FT = "cubic_ft"
    CUBIC_M = "cubic_m"
    NUMBERS = "numbers"
    LITERS = "liters"
    SQUARE_FT = "square_ft"
    ROLLS = "rolls"
    OTHER = "other"


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    material_type = Column(SAEnum(MaterialType), nullable=False)
    unit = Column(SAEnum(UnitType), nullable=False)
    current_stock = Column(Float, default=0.0)
    reorder_level = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)
    supplier_name = Column(String(255))
    supplier_contact = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    arrivals = relationship("MaterialArrival", back_populates="material", cascade="all, delete-orphan")
    consumptions = relationship("MaterialConsumption", back_populates="material", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Material {self.name}>"


class MaterialArrival(Base):
    __tablename__ = "material_arrivals"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    supplier_name = Column(String(255))
    invoice_number = Column(String(100))
    invoice_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    arrival_date = Column(Date, nullable=False)
    received_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    material = relationship("Material", back_populates="arrivals")
    payments = relationship("MaterialPayment", back_populates="arrival", cascade="all, delete-orphan")


class MaterialPayment(Base):
    __tablename__ = "material_payments"

    id = Column(Integer, primary_key=True, index=True)
    arrival_id = Column(Integer, ForeignKey("material_arrivals.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    arrival = relationship("MaterialArrival", back_populates="payments")


class MaterialConsumption(Base):
    __tablename__ = "material_consumptions"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    area = Column(String(255))
    work_area = Column(String(255))
    consumption_date = Column(Date, nullable=False)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    material = relationship("Material", back_populates="consumptions")
