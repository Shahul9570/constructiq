from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_OWNER = "company_owner"
    PROJECT_MANAGER = "project_manager"
    SITE_ENGINEER = "site_engineer"
    CONTRACTOR = "contractor"
    ACCOUNTANT = "accountant"
    CLIENT = "client"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.SITE_ENGINEER)
    company_name = Column(String(255))
    # Company isolation fields
    company_code = Column(String(20), unique=True, nullable=True, index=True)
    company_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    company_staff = relationship(
        "User",
        foreign_keys="[User.company_owner_id]",
        primaryjoin="User.company_owner_id == User.id",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<User {self.email} ({self.role.value})>"
