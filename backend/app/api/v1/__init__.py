from fastapi import APIRouter

from app.api.v1 import auth, users, projects, workforce, contractors
from app.api.v1 import materials, equipment, daily_progress, financial
from app.api.v1 import documents, photos, dashboards, reports, ai, project_tasks, billing, notifications, admin, digital_twin

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(project_tasks.router, prefix="/project-tasks", tags=["Project Tasks"])
api_router.include_router(workforce.router, prefix="/labour", tags=["Workforce"])
api_router.include_router(contractors.router, prefix="/contractors", tags=["Contractors"])
api_router.include_router(materials.router, prefix="/materials", tags=["Materials"])
api_router.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
api_router.include_router(daily_progress.router, prefix="/daily-progress", tags=["Daily Progress"])
api_router.include_router(financial.router, prefix="/financial", tags=["Financial"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(photos.router, prefix="/photos", tags=["Photos"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Features"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Super Admin"])
api_router.include_router(digital_twin.router, prefix="", tags=["Digital Twin"])
