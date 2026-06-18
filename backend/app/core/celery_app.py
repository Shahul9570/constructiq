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
