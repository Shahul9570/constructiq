from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "constructiq",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    beat_schedule={
        'check-pending-invoices-daily': {
            'task': 'app.core.celery_app.check_pending_invoices_task',
            'schedule': 86400.0, # Run daily (in seconds)
        },
    }
)


@celery_app.task(bind=True, max_retries=3)
def generate_report_task(self, report_type: str, data: dict):
    try:
        from app.services.report_service import ReportService
        service = ReportService()
        result = service.generate(report_type, data)
        return result
    except Exception as e:
        self.retry(exc=e, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def ai_analysis_task(self, analysis_type: str, project_id: int, data: dict):
    try:
        from app.services.ai_service import AIService
        service = AIService()
        result = service.analyze(analysis_type, project_id, data)
        return result
    except Exception as e:
        self.retry(exc=e, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def check_pending_invoices_task(self):
    try:
        from app.core.database import SessionLocal
        from app.models.financial import Invoice, InvoiceStatus
        from app.models.project import Project
        from app.models.notification import Notification, NotificationType
        from app.models.user import User, UserRole
        from datetime import datetime, timedelta

        db = SessionLocal()
        try:
            # Check for PENDING_VERIFICATION older than 24h
            threshold = datetime.utcnow() - timedelta(days=1)
            pending_invoices = db.query(Invoice).filter(
                Invoice.status == 'PENDING_VERIFICATION',
                Invoice.updated_at <= threshold
            ).all()

            for invoice in pending_invoices:
                # Find owner and accountants
                project = db.query(Project).filter(Project.id == invoice.project_id).first()
                if project and project.company_id:
                    admins = db.query(User).filter(
                        User.company_code == db.query(User.company_code).filter(User.id == project.company_id).scalar(),
                        User.role.in_([UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT])
                    ).all()
                    
                    for admin in admins:
                        # Check if notification already exists to avoid spamming
                        existing = db.query(Notification).filter(
                            Notification.user_id == admin.id,
                            Notification.invoice_id == invoice.id,
                            Notification.type == NotificationType.INVOICE_PENDING
                        ).first()
                        if not existing:
                            db.add(Notification(
                                user_id=admin.id,
                                type=NotificationType.INVOICE_PENDING,
                                message=f"Invoice #{invoice.invoice_number} has been pending verification for over 24 hours.",
                                invoice_id=invoice.id
                            ))
            db.commit()
            return f"Processed {len(pending_invoices)} pending invoices."
        finally:
            db.close()
    except Exception as e:
        self.retry(exc=e, countdown=60)
