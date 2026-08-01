from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
import enum

from app.core.database import Base

class PlanTier(str, enum.Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"

class CompanySubscription(Base):
    __tablename__ = "company_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    plan_tier = Column(String(50), nullable=False, default=PlanTier.PROFESSIONAL.value)
    billing_cycle = Column(String(50), nullable=False, default=BillingCycle.MONTHLY.value)
    status = Column(String(50), nullable=False, default=SubscriptionStatus.ACTIVE.value)

    max_projects = Column(Integer, default=10)
    max_workers = Column(Integer, default=50)
    max_storage_gb = Column(Integer, default=250)
    ai_tokens_limit = Column(Integer, default=500000)

    amount_paid = Column(Float, default=499.0)
    current_period_start = Column(DateTime(timezone=True), server_default=func.now())
    current_period_end = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CompanySubscription {self.company_name} tier={self.plan_tier} status={self.status}>"
