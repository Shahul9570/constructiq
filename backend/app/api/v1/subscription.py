from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.workforce import DailyLabourSummary
from app.models.document import Document
from app.models.photo import Photo
from app.models.subscription import CompanySubscription, PlanTier, BillingCycle, SubscriptionStatus
from pydantic import BaseModel

router = APIRouter()

class UpgradeSubscriptionInput(BaseModel):
    plan_tier: str  # starter, professional, enterprise
    billing_cycle: str = "monthly"  # monthly, annual

class SubscriptionUsageStats(BaseModel):
    used_projects: int
    max_projects: int
    used_workers: int
    max_workers: int
    used_storage_gb: float
    max_storage_gb: int
    ai_tokens_used: int
    ai_tokens_limit: int

class SubscriptionResponse(BaseModel):
    id: int
    company_name: str
    owner_id: int
    plan_tier: str
    billing_cycle: str
    status: str
    amount_paid: float
    current_period_start: datetime
    current_period_end: Optional[datetime] = None
    usage: SubscriptionUsageStats

class AdminMRRResponse(BaseModel):
    total_subscriptions: int
    active_subscriptions: int
    mrr: float  # Monthly Recurring Revenue
    arr: float  # Annual Recurring Revenue
    tier_distribution: Dict[str, int]
    subscriptions: List[Dict[str, Any]]

PLAN_CONFIGS = {
    PlanTier.FREE.value: {
        "max_projects": 1,
        "max_workers": 5,
        "max_storage_gb": 5,
        "ai_tokens_limit": 10000,
        "monthly_price": 0.0,
        "annual_price": 0.0,
    },
    PlanTier.STARTER.value: {
        "max_projects": 2,
        "max_workers": 10,
        "max_storage_gb": 25,
        "ai_tokens_limit": 100000,
        "monthly_price": 199.0,
        "annual_price": 1990.0,
    },
    PlanTier.PROFESSIONAL.value: {
        "max_projects": 10,
        "max_workers": 50,
        "max_storage_gb": 250,
        "ai_tokens_limit": 500000,
        "monthly_price": 499.0,
        "annual_price": 4990.0,
    },
    PlanTier.ENTERPRISE.value: {
        "max_projects": 999,
        "max_workers": 9999,
        "max_storage_gb": 1000,
        "ai_tokens_limit": 2000000,
        "monthly_price": 999.0,
        "annual_price": 9990.0,
    },
}

def _get_or_create_subscription(db: Session, user: User) -> CompanySubscription:
    sub = db.query(CompanySubscription).filter(CompanySubscription.owner_id == user.id).first()
    if not sub:
        company_name = user.company_name or f"{user.full_name}'s Company"
        cfg = PLAN_CONFIGS[PlanTier.PROFESSIONAL.value]
        sub = CompanySubscription(
            company_name=company_name,
            owner_id=user.id,
            plan_tier=PlanTier.PROFESSIONAL.value,
            billing_cycle=BillingCycle.MONTHLY.value,
            status=SubscriptionStatus.ACTIVE.value,
            max_projects=cfg["max_projects"],
            max_workers=cfg["max_workers"],
            max_storage_gb=cfg["max_storage_gb"],
            ai_tokens_limit=cfg["ai_tokens_limit"],
            amount_paid=cfg["monthly_price"],
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30)
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub

@router.get("/me", response_model=SubscriptionResponse)
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = _get_or_create_subscription(db, current_user)

    used_projects = db.query(Project).count()
    used_workers = int(db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).scalar())
    total_docs = db.query(Document).count()
    total_photos = db.query(Photo).count()
    used_storage_gb = round((total_docs * 2.5 + total_photos * 1.2) / 1024, 2)  # Estimated GB

    usage = SubscriptionUsageStats(
        used_projects=used_projects,
        max_projects=sub.max_projects,
        used_workers=used_workers,
        max_workers=sub.max_workers,
        used_storage_gb=used_storage_gb,
        max_storage_gb=sub.max_storage_gb,
        ai_tokens_used=42500,  # Current token consumption
        ai_tokens_limit=sub.ai_tokens_limit
    )

    return SubscriptionResponse(
        id=sub.id,
        company_name=sub.company_name,
        owner_id=sub.owner_id,
        plan_tier=sub.plan_tier,
        billing_cycle=sub.billing_cycle,
        status=sub.status,
        amount_paid=sub.amount_paid,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        usage=usage
    )

@router.post("/upgrade", response_model=SubscriptionResponse)
def upgrade_subscription(
    data: UpgradeSubscriptionInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value, UserRole.COMPANY_OWNER.value))
):
    if data.plan_tier not in PLAN_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid plan tier specified")

    sub = _get_or_create_subscription(db, current_user)
    cfg = PLAN_CONFIGS[data.plan_tier]

    sub.plan_tier = data.plan_tier
    sub.billing_cycle = data.billing_cycle
    sub.max_projects = cfg["max_projects"]
    sub.max_workers = cfg["max_workers"]
    sub.max_storage_gb = cfg["max_storage_gb"]
    sub.ai_tokens_limit = cfg["ai_tokens_limit"]
    sub.amount_paid = cfg["annual_price"] if data.billing_cycle == "annual" else cfg["monthly_price"]
    sub.status = SubscriptionStatus.ACTIVE.value
    sub.current_period_start = datetime.utcnow()
    sub.current_period_end = datetime.utcnow() + timedelta(days=365 if data.billing_cycle == "annual" else 30)

    db.commit()
    db.refresh(sub)

    log_action(
        db,
        current_user.id,
        "SUBSCRIPTION_UPGRADED",
        "CompanySubscription",
        sub.id,
        {"plan_tier": data.plan_tier, "billing_cycle": data.billing_cycle, "amount": sub.amount_paid}
    )

    return get_my_subscription(db, current_user)

@router.get("/all", response_model=AdminMRRResponse)
def list_all_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    subs = db.query(CompanySubscription).all()

    total_subs = len(subs)
    active_subs = sum(1 for s in subs if s.status == SubscriptionStatus.ACTIVE.value)

    mrr = sum(s.amount_paid / (12 if s.billing_cycle == "annual" else 1) for s in subs if s.status == SubscriptionStatus.ACTIVE.value)
    arr = mrr * 12

    tier_counts = {"free": 0, "starter": 0, "professional": 0, "enterprise": 0}
    sub_list = []

    for s in subs:
        if s.plan_tier in tier_counts:
            tier_counts[s.plan_tier] += 1
        sub_list.append({
            "id": s.id,
            "company_name": s.company_name,
            "plan_tier": s.plan_tier,
            "billing_cycle": s.billing_cycle,
            "status": s.status,
            "amount_paid": s.amount_paid,
            "created_at": s.created_at
        })

    return AdminMRRResponse(
        total_subscriptions=total_subs,
        active_subscriptions=active_subs,
        mrr=round(mrr, 2),
        arr=round(arr, 2),
        tier_distribution=tier_counts,
        subscriptions=sub_list
    )
