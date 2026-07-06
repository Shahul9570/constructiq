from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from typing import Optional

def log_action(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """
    Log an action to the audit_logs table.
    Best effort logging; if it fails, it rolls back but does not crash the request.
    """
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address
    )
    db.add(audit_log)
    try:
        db.commit()
    except Exception:
        db.rollback()
        pass
