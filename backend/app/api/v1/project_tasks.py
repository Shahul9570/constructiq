from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project_task import ProjectTask
from app.schemas.project_task import (
    ProjectTaskCreate, ProjectTaskUpdate, ProjectTaskResponse
)

router = APIRouter()


@router.get("/", response_model=list[ProjectTaskResponse])
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = db.query(ProjectTask).filter(ProjectTask.project_id == project_id).all()
    results = []
    for task in tasks:
        task_data = task.__dict__.copy()
        if task.assigned_to:
            task_data["assigned_to_name"] = task.assigned_to.full_name
        results.append(ProjectTaskResponse(**task_data))
    return results


@router.post("/", response_model=ProjectTaskResponse, status_code=201)
def create_task(
    data: ProjectTaskCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = ProjectTask(**data.model_dump(), project_id=project_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


from app.models.project import Project
from app.services.notification_service import trigger_milestone_completed_notification

@router.patch("/{task_id}", response_model=ProjectTaskResponse)
def update_task(
    task_id: int,
    data: ProjectTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(ProjectTask).filter(ProjectTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = str(task.status).lower() if task.status else ""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    new_status = str(task.status).lower() if task.status else ""
    if old_status != "completed" and new_status == "completed":
        proj = db.query(Project).filter(Project.id == task.project_id).first()
        if proj and proj.client_id:
            trigger_milestone_completed_notification(db, proj.client_id, proj.name, task.name)

    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(ProjectTask).filter(ProjectTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
