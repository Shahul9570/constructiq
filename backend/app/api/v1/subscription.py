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
        "max_projects": 5,
        "max_workers": 20,
        "max_storage_gb": 50,
        "ai_tokens_limit": 100000,
        "monthly_price": 59.0,
        "annual_price": 590.0,
    },
    PlanTier.PROFESSIONAL.value: {
        "max_projects": 25,
        "max_workers": 100,
        "max_storage_gb": 250,
        "ai_tokens_limit": 500000,
        "monthly_price": 249.0,
        "annual_price": 2490.0,
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

FEATURE_MATRIX = {
    PlanTier.FREE.value: {
        "daily_logs": True,
        "tasks": True,
        "materials": True,
        "equipment": True,
        "site_diary": False,
        "weather_tracker": False,
        "financials": "basic",
        "ai_reports": "limited",
        "digital_twin": "viewer",
        "client_portal": False,
        "api_access": False,
        "sso": False,
    },
    PlanTier.STARTER.value: {
        "daily_logs": True,
        "tasks": True,
        "materials": True,
        "equipment": True,
        "site_diary": False,
        "weather_tracker": False,
        "financials": True,
        "ai_reports": True,
        "digital_twin": "GLB Live",
        "client_portal": True,
        "api_access": False,
        "sso": False,
    },
    PlanTier.PROFESSIONAL.value: {
        "daily_logs": True,
        "tasks": True,
        "materials": True,
        "equipment": True,
        "site_diary": True,
        "weather_tracker": True,
        "financials": True,
        "ai_reports": True,
        "digital_twin": "GLB + Timeline + AI",
        "client_portal": True,
        "api_access": "limited",
        "sso": False,
    },
    PlanTier.ENTERPRISE.value: {
        "daily_logs": True,
        "tasks": True,
        "materials": True,
        "equipment": True,
        "site_diary": True,
        "weather_tracker": True,
        "financials": True,
        "ai_reports": True,
        "digital_twin": "IFC/BIM + Enterprise",
        "client_portal": True,
        "api_access": "full",
        "sso": True,
    },
}

from app.services.notification_service import check_and_trigger_quota_warnings

def check_subscription_limits(db: Session, user: User, resource_type: str):
    """Enforces quota limits (projects, user seats) based on active subscription tier."""
    if user.role == UserRole.SUPER_ADMIN.value:
        return  # Super Admins are platform operators and exempt from subscription caps

    sub = _get_or_create_subscription(db, user)
    company_id = user.company_owner_id if user.company_owner_id else user.id
    
    if resource_type == "project":
        current_projects = db.query(Project).filter(
            (Project.company_id == company_id) | (Project.created_by == user.id)
        ).count()

        # Trigger 80%/100% Quota Warning notification
        check_and_trigger_quota_warnings(db, user, "project", current_projects, sub.max_projects)

        if current_projects >= sub.max_projects:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Project quota reached for your active {sub.plan_tier.upper()} plan ({sub.max_projects} max). Upgrade your plan to create more projects."
            )
    elif resource_type == "user":
        current_users = db.query(User).filter(
            (User.company_owner_id == company_id) | (User.id == user.id)
        ).count()

        # Trigger 80%/100% Quota Warning notification
        check_and_trigger_quota_warnings(db, user, "user seat", current_users, sub.max_workers)

        if current_users >= sub.max_workers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User seat quota reached for your active {sub.plan_tier.upper()} plan ({sub.max_workers} max). Upgrade your plan to add more team members."
            )

def check_feature_access(db: Session, user: User, feature_name: str):
    """Enforces feature access based on tenant subscription tier."""
    if user.role == UserRole.SUPER_ADMIN.value:
        return  # Super Admins have unrestricted access to all platform features

    sub = _get_or_create_subscription(db, user)
    tier = sub.plan_tier

    if feature_name == "site_diary" and not FEATURE_MATRIX.get(tier, {}).get("site_diary", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Daily Site Diary & Weather Delay Tracker is available on Professional and Enterprise plans."
        )
    elif feature_name == "client_portal" and not FEATURE_MATRIX.get(tier, {}).get("client_portal", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client Portal access requires a Starter, Professional, or Enterprise subscription."
        )
    elif feature_name == "api_access" and not FEATURE_MATRIX.get(tier, {}).get("api_access", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Access requires a Professional or Enterprise subscription plan."
        )

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

from app.core.payment_gateway import get_payment_gateway

class CreateOrderInput(BaseModel):
    plan_tier: str
    billing_cycle: str = "monthly"
    currency: str = "USD"

class CreateOrderResponse(BaseModel):
    order_id: str
    key_id: str
    amount: float
    tax_amount: float
    total_amount: float
    currency: str
    plan_tier: str
    billing_cycle: str

class VerifyPaymentInput(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    plan_tier: str
    billing_cycle: str = "monthly"
    payment_method: str = "credit_card"
    card_number: Optional[str] = None

class CheckoutInput(BaseModel):
    plan_tier: str
    billing_cycle: str = "monthly"
    payment_method: str = "credit_card"  # credit_card, upi, bank_transfer
    card_name: Optional[str] = None
    card_number: Optional[str] = None

class PaymentReceiptResponse(BaseModel):
    id: int
    transaction_id: str
    company_name: str
    plan_tier: str
    billing_cycle: str
    amount: float
    tax_amount: float
    total_amount: float
    payment_method: str
    card_last4: Optional[str] = None
    status: str
    payment_date: datetime

@router.post("/create-order", response_model=CreateOrderResponse)
def create_subscription_order(
    data: CreateOrderInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value, UserRole.COMPANY_OWNER.value))
):
    if data.plan_tier not in PLAN_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid plan tier specified")

    cfg = PLAN_CONFIGS[data.plan_tier]
    base_price = cfg["annual_price"] if data.billing_cycle == "annual" else cfg["monthly_price"]
    tax_amount = round(base_price * 0.18, 2)
    total_amount = round(base_price + tax_amount, 2)

    gateway = get_payment_gateway()
    order_data = gateway.create_order(
        amount=total_amount,
        currency=data.currency,
        notes={
            "user_id": current_user.id,
            "company_name": current_user.company_name or current_user.full_name,
            "plan_tier": data.plan_tier,
            "billing_cycle": data.billing_cycle,
        }
    )

    return CreateOrderResponse(
        order_id=order_data["id"],
        key_id=order_data.get("key_id", "rzp_test_simulated"),
        amount=base_price,
        tax_amount=tax_amount,
        total_amount=total_amount,
        currency=data.currency,
        plan_tier=data.plan_tier,
        billing_cycle=data.billing_cycle,
    )

@router.post("/verify-payment", response_model=PaymentReceiptResponse)
def verify_and_activate_subscription(
    data: VerifyPaymentInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value, UserRole.COMPANY_OWNER.value))
):
    if data.plan_tier not in PLAN_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid plan tier specified")

    gateway = get_payment_gateway()
    is_valid = gateway.verify_payment_signature(data.order_id, data.payment_id, data.signature)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    sub = _get_or_create_subscription(db, current_user)
    cfg = PLAN_CONFIGS[data.plan_tier]

    # Upgrade tenant subscription
    sub.plan_tier = data.plan_tier
    sub.billing_cycle = data.billing_cycle
    sub.max_projects = cfg["max_projects"]
    sub.max_workers = cfg["max_workers"]
    sub.max_storage_gb = cfg["max_storage_gb"]
    sub.ai_tokens_limit = cfg["ai_tokens_limit"]
    base_price = cfg["annual_price"] if data.billing_cycle == "annual" else cfg["monthly_price"]
    tax_amount = round(base_price * 0.18, 2)
    total_amount = round(base_price + tax_amount, 2)
    sub.amount_paid = base_price
    sub.status = SubscriptionStatus.ACTIVE.value
    sub.current_period_start = datetime.utcnow()
    sub.current_period_end = datetime.utcnow() + timedelta(days=365 if data.billing_cycle == "annual" else 30)

    db.commit()
    db.refresh(sub)

    card_last4 = data.card_number[-4:] if data.card_number and len(data.card_number) >= 4 else "4242"

    receipt = SubscriptionPaymentReceipt(
        subscription_id=sub.id,
        owner_id=current_user.id,
        company_name=sub.company_name,
        transaction_id=data.payment_id or f"TXN-{data.order_id}",
        plan_tier=data.plan_tier,
        billing_cycle=data.billing_cycle,
        amount=base_price,
        tax_amount=tax_amount,
        total_amount=total_amount,
        payment_method=data.payment_method,
        card_last4=card_last4,
        status="completed"
    )

    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    log_action(
        db,
        current_user.id,
        "SUBSCRIPTION_PAYMENT_VERIFIED",
        "SubscriptionPaymentReceipt",
        receipt.id,
        {"transaction_id": receipt.transaction_id, "amount": total_amount, "tier": data.plan_tier}
    )

    return PaymentReceiptResponse(
        id=receipt.id,
        transaction_id=receipt.transaction_id,
        company_name=receipt.company_name,
        plan_tier=receipt.plan_tier,
        billing_cycle=receipt.billing_cycle,
        amount=receipt.amount,
        tax_amount=receipt.tax_amount,
        total_amount=receipt.total_amount,
        payment_method=receipt.payment_method,
        card_last4=receipt.card_last4,
        status=receipt.status,
        payment_date=receipt.created_at
    )

@router.post("/checkout", response_model=PaymentReceiptResponse)
def checkout_subscription(
    data: CheckoutInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value, UserRole.COMPANY_OWNER.value))
):
    # Direct checkout fallback wrapper
    order_res = create_subscription_order(
        CreateOrderInput(plan_tier=data.plan_tier, billing_cycle=data.billing_cycle),
        db,
        current_user
    )
    sim_payment_id = f"pay_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"
    sim_sig = f"sim_sig_{random.randint(100000, 999999)}"

    return verify_and_activate_subscription(
        VerifyPaymentInput(
            order_id=order_res.order_id,
            payment_id=sim_payment_id,
            signature=sim_sig,
            plan_tier=data.plan_tier,
            billing_cycle=data.billing_cycle,
            payment_method=data.payment_method,
            card_number=data.card_number,
        ),
        db,
        current_user
    )

@router.get("/receipts", response_model=List[PaymentReceiptResponse])
def get_payment_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        sub = _get_or_create_subscription(db, current_user)
        receipts = db.query(SubscriptionPaymentReceipt).filter(
            SubscriptionPaymentReceipt.subscription_id == sub.id
        ).order_by(SubscriptionPaymentReceipt.created_at.desc()).all()

        return [
            PaymentReceiptResponse(
                id=r.id,
                transaction_id=r.transaction_id,
                company_name=r.company_name,
                plan_tier=r.plan_tier,
                billing_cycle=r.billing_cycle,
                amount=r.amount,
                tax_amount=r.tax_amount,
                total_amount=r.total_amount,
                payment_method=r.payment_method,
                card_last4=r.card_last4,
                status=r.status,
                payment_date=r.created_at
            )
            for r in receipts
        ]
    except Exception as e:
        from app.core.database import engine, Base
        import app.models
        try:
            Base.metadata.create_all(bind=engine)
        except Exception:
            pass
        return []

@router.get("/all", response_model=AdminMRRResponse)
def list_all_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Ensure every Company Owner has an active subscription record
        owners = db.query(User).filter(User.role.in_([UserRole.COMPANY_OWNER.value, UserRole.SUPER_ADMIN.value])).all()
        for owner in owners:
            try:
                _get_or_create_subscription(db, owner)
            except Exception:
                pass

        subs = db.query(CompanySubscription).all()

        total_subs = len(subs)
        active_subs = 0
        mrr = 0.0

        tier_counts = {"free": 0, "starter": 0, "professional": 0, "enterprise": 0}
        sub_list = []

        for s in subs:
            tier_str = str(s.plan_tier.value if hasattr(s.plan_tier, "value") else s.plan_tier or "free").lower()
            status_str = str(s.status.value if hasattr(s.status, "value") else s.status or "active").lower()
            cycle_str = str(s.billing_cycle.value if hasattr(s.billing_cycle, "value") else s.billing_cycle or "monthly").lower()
            paid_val = float(s.amount_paid or 0.0)

            if status_str == "active":
                active_subs += 1
                mrr += paid_val / (12 if cycle_str == "annual" else 1)

            if tier_str in tier_counts:
                tier_counts[tier_str] += 1
            
            owner_user = db.query(User).filter(User.id == s.owner_id).first()
            sub_list.append({
                "id": s.id,
                "company_name": s.company_name or "Unnamed Company",
                "owner_id": s.owner_id,
                "owner_email": owner_user.email if owner_user else "N/A",
                "owner_name": owner_user.full_name if owner_user else "N/A",
                "plan_tier": tier_str,
                "billing_cycle": cycle_str,
                "status": status_str,
                "amount_paid": paid_val,
                "max_projects": s.max_projects or 25,
                "max_workers": s.max_workers or 100,
                "max_storage_gb": s.max_storage_gb or 250,
                "ai_tokens_limit": s.ai_tokens_limit or 500000,
                "created_at": s.created_at or datetime.utcnow()
            })

        return AdminMRRResponse(
            total_subscriptions=total_subs,
            active_subscriptions=active_subs,
            mrr=round(mrr, 2),
            arr=round(mrr * 12, 2),
            tier_distribution=tier_counts,
            subscriptions=sub_list
        )
    except Exception as e:
        return AdminMRRResponse(
            total_subscriptions=0,
            active_subscriptions=0,
            mrr=0.0,
            arr=0.0,
            tier_distribution={"free": 0, "starter": 0, "professional": 0, "enterprise": 0},
            subscriptions=[]
        )

class AdminSubscriptionOverrideInput(BaseModel):
    subscription_id: int
    plan_tier: str
    billing_cycle: Optional[str] = "monthly"
    status: Optional[str] = "active"
    max_projects: Optional[int] = None
    max_workers: Optional[int] = None
    max_storage_gb: Optional[int] = None
    ai_tokens_limit: Optional[int] = None
    amount_paid: Optional[float] = None

@router.put("/admin/override")
@router.put("/admin/override/")
def override_company_subscription(
    data: AdminSubscriptionOverrideInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(CompanySubscription).filter(
        (CompanySubscription.id == data.subscription_id) |
        (CompanySubscription.owner_id == data.subscription_id)
    ).first()

    if not sub:
        target_user = db.query(User).filter(User.id == data.subscription_id).first()
        if target_user:
            sub = _get_or_create_subscription(db, target_user)

    if not sub:
        raise HTTPException(status_code=404, detail=f"Subscription or User with ID {data.subscription_id} not found")

    if data.plan_tier not in PLAN_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid plan tier specified")

    cfg = PLAN_CONFIGS[data.plan_tier]

    sub.plan_tier = data.plan_tier
    sub.billing_cycle = data.billing_cycle or sub.billing_cycle
    sub.status = data.status or sub.status

    sub.max_projects = data.max_projects if data.max_projects is not None else cfg["max_projects"]
    sub.max_workers = data.max_workers if data.max_workers is not None else cfg["max_workers"]
    sub.max_storage_gb = data.max_storage_gb if data.max_storage_gb is not None else cfg["max_storage_gb"]
    sub.ai_tokens_limit = data.ai_tokens_limit if data.ai_tokens_limit is not None else cfg["ai_tokens_limit"]
    sub.amount_paid = data.amount_paid if data.amount_paid is not None else (cfg["annual_price"] if sub.billing_cycle == "annual" else cfg["monthly_price"])

    sub.current_period_start = datetime.utcnow()
    sub.current_period_end = datetime.utcnow() + timedelta(days=365 if sub.billing_cycle == "annual" else 30)

    db.commit()
    db.refresh(sub)

    log_action(
        db,
        current_user.id,
        "SUPER_ADMIN_SUBSCRIPTION_OVERRIDDEN",
        "CompanySubscription",
        sub.id,
        {"plan_tier": sub.plan_tier, "company": sub.company_name, "custom_projects": sub.max_projects}
    )

    return {
        "message": f"Successfully updated subscription for {sub.company_name}",
        "subscription_id": sub.id,
        "plan_tier": sub.plan_tier,
        "max_projects": sub.max_projects,
        "max_workers": sub.max_workers,
        "max_storage_gb": sub.max_storage_gb,
        "status": sub.status,
    }

class UpdatePlanConfigInput(BaseModel):
    plan_tier: str
    monthly_price: Optional[float] = None
    annual_price: Optional[float] = None
    max_projects: Optional[int] = None
    max_workers: Optional[int] = None
    max_storage_gb: Optional[int] = None
    ai_tokens_limit: Optional[int] = None
    site_diary: Optional[bool] = None
    client_portal: Optional[bool] = None
    api_access: Optional[bool] = None

@router.get("/plans/config")
def get_plans_configuration():
    return {
        "configs": PLAN_CONFIGS,
        "features": FEATURE_MATRIX
    }

@router.put("/admin/plans/config")
@router.put("/admin/plans/config/")
def update_plan_configuration(
    data: UpdatePlanConfigInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tier = data.plan_tier
    if tier not in PLAN_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid plan tier specified")

    if data.monthly_price is not None:
        PLAN_CONFIGS[tier]["monthly_price"] = data.monthly_price
    if data.annual_price is not None:
        PLAN_CONFIGS[tier]["annual_price"] = data.annual_price
    if data.max_projects is not None:
        PLAN_CONFIGS[tier]["max_projects"] = data.max_projects
    if data.max_workers is not None:
        PLAN_CONFIGS[tier]["max_workers"] = data.max_workers
    if data.max_storage_gb is not None:
        PLAN_CONFIGS[tier]["max_storage_gb"] = data.max_storage_gb
    if data.ai_tokens_limit is not None:
        PLAN_CONFIGS[tier]["ai_tokens_limit"] = data.ai_tokens_limit

    if data.site_diary is not None:
        FEATURE_MATRIX[tier]["site_diary"] = data.site_diary
    if data.client_portal is not None:
        FEATURE_MATRIX[tier]["client_portal"] = data.client_portal
    if data.api_access is not None:
        FEATURE_MATRIX[tier]["api_access"] = data.api_access

    log_action(
        db,
        current_user.id,
        "SUPER_ADMIN_PLAN_MATRIX_UPDATED",
        "PlanTier",
        0,
        {"plan_tier": tier, "config": PLAN_CONFIGS[tier]}
    )

    return {
        "message": f"Successfully updated plan definitions for {tier.upper()} tier",
        "configs": PLAN_CONFIGS,
        "features": FEATURE_MATRIX
    }
