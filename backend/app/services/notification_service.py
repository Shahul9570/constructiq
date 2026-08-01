import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)

def create_notification(
    db: Session,
    user_id: int,
    notification_type: NotificationType,
    message: str,
    invoice_id: Optional[int] = None
) -> Notification:
    """
    Creates a new Notification record and dispatches live in-app alert payload.
    """
    notif = Notification(
        user_id=user_id,
        type=notification_type,
        message=message,
        invoice_id=invoice_id,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    logger.info(f"Dispatched Notification [{notification_type.value}] to User #{user_id}: {message}")
    return notif

def check_and_trigger_quota_warnings(db: Session, user: User, resource_type: str, current_count: int, max_limit: int):
    """
    Triggers an 80% or 100% QUOTA_WARNING notification to the Company Owner when limits approach capacity.
    """
    if max_limit <= 0:
        return

    usage_ratio = current_count / max_limit

    if usage_ratio >= 0.8:
        threshold_pct = 100 if usage_ratio >= 1.0 else 80
        msg = (
            f"⚠️ Subscription Quota Warning: You have reached {threshold_pct}% of your "
            f"allowed {resource_type}s ({current_count}/{max_limit}). Upgrade your subscription to expand capacity."
        )

        owner_id = user.company_owner_id if user.company_owner_id else user.id

        # Prevent duplicate quota warning notifications
        existing = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == NotificationType.QUOTA_WARNING,
            Notification.message.like(f"%{resource_type}s ({current_count}/{max_limit})%")
        ).first()

        if not existing:
            create_notification(db, owner_id, NotificationType.QUOTA_WARNING, msg)

def trigger_milestone_completed_notification(db: Session, client_id: int, project_name: str, task_name: str):
    """
    Triggers a MILESTONE_COMPLETED notification for linked house owners / clients when a task is completed.
    """
    if not client_id:
        return

    msg = f"🎉 Milestone Completed on [{project_name}]: '{task_name}' has been completed by the engineering team!"
    create_notification(db, client_id, NotificationType.MILESTONE_COMPLETED, msg)
