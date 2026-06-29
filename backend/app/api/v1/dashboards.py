from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.workforce import DailyLabourSummary
from app.models.financial import CostRecord
from app.models.daily_progress import DailyWorkLog
from app.models.material import Material, MaterialConsumption, MaterialArrival
from app.models.equipment import EquipmentUsage
from app.models.photo import Photo
from app.models.document import Document
from app.models.financial import Invoice, InvoiceStatus, InvoiceType
from datetime import date, timedelta

from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()
    
def _get_project_total_cost(db: Session, project_id: int) -> float:
    manual_cost = db.query(func.coalesce(func.sum(CostRecord.amount), 0)).filter(
        CostRecord.project_id == project_id,
        CostRecord.status == 'approved'
    ).scalar() or 0
    labour_cost = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count * DailyLabourSummary.daily_rate), 0)).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.verification_status == 'approved'
    ).scalar() or 0
    equipment_logs = db.query(EquipmentUsage).filter(EquipmentUsage.project_id == project_id).all()
    equipment_cost = sum(e.hours_used * e.equipment.hourly_rate for e in equipment_logs)
    material_arrivals = db.query(MaterialArrival).join(Material).filter(Material.project_id == project_id).all()
    material_cost = sum(a.invoice_amount if a.invoice_amount else (a.quantity * a.material.unit_price) for a in material_arrivals)
    return manual_cost + labour_cost + equipment_cost + material_cost

@router.get("/super-admin")
def super_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    total_projects = db.query(Project).count()
    planning_projects = db.query(Project).filter(Project.status == ProjectStatus.PLANNING).count()
    in_progress_projects = db.query(Project).filter(Project.status == ProjectStatus.IN_PROGRESS).count()
    completed_projects = db.query(Project).filter(Project.status == ProjectStatus.COMPLETED).count()
    
    total_system_budget = db.query(func.coalesce(func.sum(Project.budget), 0)).scalar() or 0
    
    # Calculate total system expenditure across all projects
    all_projects = db.query(Project).all()
    total_system_spent = sum(_get_project_total_cost(db, p.id) for p in all_projects)
    
    # Get 5 most recently created projects
    recent_projects = db.query(Project).order_by(Project.created_at.desc()).limit(5).all()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_projects": total_projects,
        "projects_by_status": {
            "planning": planning_projects,
            "in_progress": in_progress_projects,
            "completed": completed_projects
        },
        "total_system_budget": total_system_budget,
        "total_system_spent": total_system_spent,
        "recent_projects": [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "budget": p.budget,
                "created_at": p.created_at
            } for p in recent_projects
        ]
    }

@router.get("/site-engineer")
def site_engineer_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()

    today_labour_count = db.query(
        func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)
    ).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.date == today,
        DailyLabourSummary.verification_status == 'approved'
    ).scalar() or 0

    today_labour_cost = db.query(
        func.coalesce(func.sum(DailyLabourSummary.workers_count * DailyLabourSummary.daily_rate), 0)
    ).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.date == today,
        DailyLabourSummary.verification_status == 'approved'
    ).scalar() or 0

    today_material_consumption = db.query(
        func.coalesce(func.sum(MaterialConsumption.quantity), 0)
    ).join(Material).filter(
        Material.project_id == project_id,
        MaterialConsumption.consumption_date == today,
    ).scalar() or 0

    today_logs = db.query(DailyWorkLog).filter(
        DailyWorkLog.project_id == project_id,
        DailyWorkLog.date == today,
        DailyWorkLog.verification_status == 'approved'
    ).all()

    total_planned = sum(l.planned_quantity for l in today_logs)
    total_completed = sum(l.completed_quantity for l in today_logs)

    low_stock_materials = db.query(Material).filter(
        Material.project_id == project_id,
        Material.current_stock <= Material.reorder_level,
    ).count()

    return {
        "date": str(today),
        "total_labour_today": today_labour_count,
        "labour_cost_today": today_labour_cost,
        "today_material_consumption": today_material_consumption,
        "today_progress": {
            "total_activities": len(today_logs),
            "planned_quantity": total_planned,
            "completed_quantity": total_completed,
            "progress_percentage": (total_completed / total_planned * 100) if total_planned > 0 else 0,
        },
        "low_stock_alerts": low_stock_materials,
    }


@router.get("/project-manager")
def project_manager_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {"error": "Project not found"}

    delays = 0
    if project.expected_end_date:
        end_date = project.expected_end_date.date() if hasattr(project.expected_end_date, 'date') else project.expected_end_date
        if end_date < date.today():
            delays = (date.today() - end_date).days

    total_cost = _get_project_total_cost(db, project_id)
    budget = project.budget or 0.0

    budget_utilization = (total_cost / budget * 100) if budget > 0 else 0

    weekly_logs = db.query(DailyWorkLog).filter(
        DailyWorkLog.project_id == project_id,
        DailyWorkLog.date >= date.today() - timedelta(days=7),
        DailyWorkLog.verification_status == 'approved'
    ).all()

    weekly_progress = sum(l.completed_quantity for l in weekly_logs)

    total_workers = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.verification_status == 'approved',
        DailyLabourSummary.date == date.today()
    ).scalar() or 0

    return {
        "project_status": project.status.value if hasattr(project.status, 'value') else project.status,
        "progress_percentage": project.progress_percentage,
        "delays_days": delays,
        "total_cost": total_cost,
        "budget": budget,
        "budget_utilization": budget_utilization,
        "is_over_budget": total_cost > budget,
        "weekly_progress": weekly_progress,
        "total_workers": total_workers,
    }


@router.get("/owner")
def owner_dashboard(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.project import ProjectMember
    base_query = db.query(Project).filter(Project.is_archived == False)

    if current_user.role == UserRole.COMPANY_OWNER:
        base_query = base_query.filter(Project.company_id == current_user.id)
    elif current_user.role in [UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT, UserRole.CONTRACTOR, UserRole.PROJECT_MANAGER]:
        base_query = base_query.join(ProjectMember, ProjectMember.project_id == Project.id, isouter=True)
        base_query = base_query.filter(
            (Project.created_by == current_user.id) | 
            (ProjectMember.user_id == current_user.id)
        )

    all_projects = base_query.all()

    total_projects = len(all_projects)
    active_projects = sum(1 for p in all_projects if p.status == ProjectStatus.IN_PROGRESS)
    completed_projects = sum(1 for p in all_projects if p.status == ProjectStatus.COMPLETED)
    at_risk = sum(1 for p in all_projects if p.progress_percentage < 50 and p.status == ProjectStatus.IN_PROGRESS)

    if project_id:
        financial_projects = [p for p in all_projects if p.id == project_id]
    else:
        financial_projects = all_projects

    total_budget = sum((p.budget or 0.0) for p in financial_projects)
    total_cost = sum(_get_project_total_cost(db, p.id) for p in financial_projects)
    overall_progress = sum(p.progress_percentage for p in financial_projects) / len(financial_projects) if financial_projects else 0

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "total_budget": total_budget,
        "total_spent": total_cost,
        "remaining_budget": total_budget - total_cost,
        "budget_health_percentage": ((total_budget - total_cost) / total_budget * 100) if total_budget > 0 else 0,
        "overall_progress": overall_progress,
        "projects_at_risk": at_risk,
    }


@router.get("/client")
def client_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.client_name.ilike(f"%{current_user.full_name}%")).first()
    if not project:
        return {"error": "No project linked to this account."}
    
    recent_photos = db.query(Photo).filter(Photo.project_id == project.id).order_by(Photo.created_at.desc()).limit(5).all()
    recent_logs = db.query(DailyWorkLog).filter(DailyWorkLog.project_id == project.id).order_by(DailyWorkLog.date.desc()).limit(5).all()
    
    # Secure Document Vault
    client_documents = db.query(Document).filter(
        Document.project_id == project.id,
        Document.category == "client_vault"
    ).order_by(Document.created_at.desc()).all()
    
    # Financial Milestone Tracker
    client_invoices = db.query(Invoice).filter(
        Invoice.project_id == project.id,
        Invoice.invoice_type == InvoiceType.CLIENT
    ).order_by(Invoice.issue_date.desc()).all()
    
    total_paid = sum(inv.total_amount for inv in client_invoices if inv.status == InvoiceStatus.PAID)
    total_pending = sum(inv.total_amount for inv in client_invoices if inv.status in [InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT])

    return {
        "project_name": project.name,
        "location": project.location,
        "start_date": str(project.start_date),
        "expected_end_date": str(project.expected_end_date),
        "progress_percentage": project.progress_percentage,
        "budget": project.budget,
        "status": project.status.value if hasattr(project.status, 'value') else project.status,
        "recent_photos": [{"url": p.file_url, "caption": p.caption} for p in recent_photos],
        "recent_activities": [{"date": str(l.date), "activity": l.activity, "progress": (l.completed_quantity/l.planned_quantity*100) if l.planned_quantity > 0 else 0} for l in recent_logs],
        "documents": [{"name": d.name, "url": d.file_url, "date": str(d.created_at.date()), "size": d.file_size} for d in client_documents],
        "invoices": [{"invoice_number": i.invoice_number, "amount": i.total_amount, "status": i.status.value if hasattr(i.status, 'value') else i.status, "due_date": str(i.due_date) if i.due_date else None, "url": i.file_url} for i in client_invoices],
        "total_paid": total_paid,
        "total_pending": total_pending,
    }
