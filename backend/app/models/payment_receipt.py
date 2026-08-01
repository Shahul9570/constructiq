from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base

class SubscriptionPaymentReceipt(Base):
    __tablename__ = "subscription_payment_receipts"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("company_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)

    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    plan_tier = Column(String(50), nullable=False)
    billing_cycle = Column(String(50), nullable=False, default="monthly")
    
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)

    payment_method = Column(String(50), default="credit_card")  # credit_card, upi, bank_transfer
    card_last4 = Column(String(10), nullable=True)
    status = Column(String(50), default="completed")           # completed, pending, failed

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<SubscriptionPaymentReceipt {self.transaction_id} plan={self.plan_tier} total={self.total_amount}>"
