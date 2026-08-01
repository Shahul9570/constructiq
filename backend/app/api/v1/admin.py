from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Any, Dict
from datetime import datetime
import os
try:
    import psutil
except ImportError:
    psutil = None

from app.core.database import get_db
from app.core.security import require_roles
from app.core.audit import log_action
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.photo import Photo
from app.models.workforce import DailyLabourSummary
from app.models.material import Material
from app.schemas.user import UserResponse
from pydantic import BaseModel

router = APIRouter()

# In-memory platform settings store with default enterprise values
PLATFORM_SETTINGS = {
    "maintenance_mode": False,
    "announcement_banner": "",
    "enable_ai_assistant": True,
    "enable_3d_visualizer": True,
    "enable_client_portal": True,
    "require_2fa": False,
    "max_file_upload_mb": 50,
    "ai_monthly_token_limit": 500000,
}

class SystemStats(BaseModel):
    total_users: int
    active_users: int
    total_projects: int

class UserStatusUpdate(BaseModel):
    is_active: bool

class AuditLogItem(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogPaginatedResponse(BaseModel):
    items: List[AuditLogItem]
    total: int
    page: int
    size: int
    pages: int

class SystemHealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    cpu_usage_percent: float
    memory_usage_percent: float
    total_users: int
    active_users: int
    total_projects: int
    total_workers: int
    total_documents: int
    total_photos: int
    total_audit_events: int
    role_distribution: Dict[str, int]
    storage_status: Dict[str, Any]

class PlatformSettingsUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    announcement_banner: Optional[str] = None
    enable_ai_assistant: Optional[bool] = None
    enable_3d_visualizer: Optional[bool] = None
    enable_client_portal: Optional[bool] = None
    require_2fa: Optional[bool] = None
    max_file_upload_mb: Optional[int] = None
    ai_monthly_token_limit: Optional[int] = None

START_TIME = datetime.utcnow()

@router.get("/stats", response_model=SystemStats)
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_projects = db.query(Project).count()
    
    return SystemStats(
        total_users=total_users,
        active_users=active_users,
        total_projects=total_projects
    )

@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    
    log_action(db, current_user.id, "USER_STATUS_UPDATED", "User", user.id, {"is_active": data.is_active}, request.client.host if request.client else None)
    
    return user

@router.get("/audit-logs", response_model=AuditLogPaginatedResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    query = db.query(AuditLog)

    if action and action != "all":
        query = query.filter(AuditLog.action == action)

    if search:
        search_pattern = f"%{search}%"
        query = query.join(User, isouter=True).filter(
            or_(
                AuditLog.action.ilike(search_pattern),
                AuditLog.entity_type.ilike(search_pattern),
                AuditLog.ip_address.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for log in logs:
        user_name = log.user.full_name if log.user else "System"
        user_email = log.user.email if log.user else "N/A"
        items.append(
            AuditLogItem(
                id=log.id,
                user_id=log.user_id,
                user_name=user_name,
                user_email=user_email,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=log.details,
                ip_address=log.ip_address,
                created_at=log.created_at
            )
        )

    pages = (total + size - 1) // size if total > 0 else 1

    return AuditLogPaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/system-health", response_model=SystemHealthResponse)
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_projects = db.query(Project).count()
    total_workers = int(db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).scalar())
    total_documents = db.query(Document).count()
    total_photos = db.query(Photo).count()
    total_audit_events = db.query(AuditLog).count()

    # Role breakdown
    roles_raw = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_distribution = {role: count for role, count in roles_raw}

    uptime = (datetime.utcnow() - START_TIME).total_seconds()
    cpu_percent = psutil.cpu_percent(interval=None) if psutil else 0.0
    memory_percent = psutil.virtual_memory().percent if psutil else 0.0

    return SystemHealthResponse(
        status="healthy",
        uptime_seconds=uptime,
        cpu_usage_percent=cpu_percent,
        memory_usage_percent=memory_percent,
        total_users=total_users,
        active_users=active_users,
        total_projects=total_projects,
        total_workers=total_workers,
        total_documents=total_documents,
        total_photos=total_photos,
        total_audit_events=total_audit_events,
        role_distribution=role_distribution,
        storage_status={
            "provider": "S3 / MinIO",
            "status": "connected",
            "total_files": total_documents + total_photos,
        }
    )

@router.get("/platform-settings")
def get_platform_settings(
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    return PLATFORM_SETTINGS

@router.patch("/platform-settings")
def update_platform_settings(
    data: PlatformSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value))
):
    updates = data.model_dump(exclude_unset=True)
    for key, val in updates.items():
        if val is not None:
            PLATFORM_SETTINGS[key] = val

    log_action(
        db,
        current_user.id,
        "PLATFORM_SETTINGS_UPDATED",
        "SystemSettings",
        1,
        updates,
        request.client.host if request.client else None
    )

    return PLATFORM_SETTINGS

