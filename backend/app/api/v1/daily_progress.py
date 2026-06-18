from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.daily_progress import DailyWorkLog
from app.models.project import Project
from app.schemas.daily_progress import (
    DailyWorkLogCreate, DailyWorkLogUpdate, DailyWorkLogResponse, DailyWorkLogList,
)

router = APIRouter()

from app.models.project_task import ProjectTask

def _update_project_progress(db: Session, project_id: int):
    # 1. Update progress_percentage for all ProjectTasks based on their linked daily logs
    tasks = db.query(ProjectTask).filter(ProjectTask.project_id == project_id).all()
    overall_progress = 0.0
    
    for task in tasks:
        logs = db.query(DailyWorkLog).filter(DailyWorkLog.task_id == task.id).all()
        if logs:
            total_planned = sum(l.planned_quantity for l in logs)
            total_completed = sum(l.completed_quantity for l in logs)
            task.progress_percentage = min((total_completed / total_planned * 100) if total_planned > 0 else 0.0, 100.0)
        else:
            task.progress_percentage = 0.0
            
        # Add to overall progress (Weighted: e.g., if task is 20% weight and 50% done, adds 10% to overall)
        overall_progress += (task.progress_percentage * task.weight_percentage / 100.0)
        
    db.commit()

    # 2. Update Project overall progress
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        project.progress_percentage = min(overall_progress, 100.0)
        db.commit()


@router.get("/", response_model=DailyWorkLogList)
def list_logs(
    project_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DailyWorkLog).filter(DailyWorkLog.project_id == project_id)
    if date_from:
        query = query.filter(DailyWorkLog.date >= date_from)
    if date_to:
        query = query.filter(DailyWorkLog.date <= date_to)
    if area:
        query = query.filter(DailyWorkLog.area.ilike(f"%{area}%"))
    total = query.count()
    logs = query.order_by(DailyWorkLog.date.desc(), DailyWorkLog.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for log in logs:
        resp = DailyWorkLogResponse.model_validate(log)
        if log.planned_quantity > 0:
            resp.progress_percentage = (log.completed_quantity / log.planned_quantity) * 100
        items.append(resp)

    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/", response_model=DailyWorkLogResponse, status_code=201)
def create_log(
    data: DailyWorkLogCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = DailyWorkLog(**data.model_dump(), project_id=project_id, created_by=current_user.id)
    db.add(log)
    db.commit()
    db.refresh(log)
    _update_project_progress(db, project_id)
    return log


@router.get("/{log_id}", response_model=DailyWorkLogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(DailyWorkLog).filter(DailyWorkLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")
    resp = DailyWorkLogResponse.model_validate(log)
    if log.planned_quantity > 0:
        resp.progress_percentage = (log.completed_quantity / log.planned_quantity) * 100
    return resp


@router.patch("/{log_id}", response_model=DailyWorkLogResponse)
def update_log(
    log_id: int,
    data: DailyWorkLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(DailyWorkLog).filter(DailyWorkLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(log, key, value)
    db.commit()
    db.refresh(log)
    _update_project_progress(db, log.project_id)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(DailyWorkLog).filter(DailyWorkLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")
    project_id = log.project_id
    db.delete(log)
    db.commit()
    _update_project_progress(db, project_id)


@router.get("/summary/daily")
def daily_summary(
    project_id: int,
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = db.query(DailyWorkLog).filter(
        DailyWorkLog.project_id == project_id,
        DailyWorkLog.date == date,
    ).all()

    total_planned = sum(l.planned_quantity for l in logs)
    total_completed = sum(l.completed_quantity for l in logs)
    total_labour_hours = sum(l.labour_hours for l in logs)
    total_workers = sum(l.workers_count for l in logs)

    return {
        "date": date,
        "total_activities": len(logs),
        "total_planned": total_planned,
        "total_completed": total_completed,
        "progress_percentage": (total_completed / total_planned * 100) if total_planned > 0 else 0,
        "total_labour_hours": total_labour_hours,
        "total_workers": total_workers,
    }
