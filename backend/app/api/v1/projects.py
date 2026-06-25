from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.project import Project, ProjectBlock, ProjectStructure, ProjectStatus, ProjectMember
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectList,
    ProjectBlockCreate, ProjectBlockResponse,
    ProjectStructureCreate, ProjectStructureResponse,
    ProjectMemberCreate, ProjectMemberResponse
)

router = APIRouter()


@router.get("/", response_model=ProjectList)
def list_projects(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    is_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Project).filter(Project.is_archived == is_archived)
    
    if current_user.role == UserRole.CLIENT:
        query = query.filter(Project.client_id == current_user.id)
    elif current_user.role in [UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT, UserRole.CONTRACTOR, UserRole.PROJECT_MANAGER]:
        # They can see projects they created OR are assigned to as a member
        query = query.join(ProjectMember, ProjectMember.project_id == Project.id, isouter=True)
        query = query.filter(
            (Project.created_by == current_user.id) | 
            (ProjectMember.user_id == current_user.id)
        )
    elif current_user.role == UserRole.COMPANY_OWNER:
        # Company owners only see their own projects
        query = query.filter(Project.created_by == current_user.id)
    elif current_user.role != UserRole.SUPER_ADMIN:
        # Fallback for any other unexpected roles to fail safe
        query = query.filter(Project.created_by == current_user.id)

    if status:
        query = query.filter(Project.status == status)
    if search:
        query = query.filter(
            (Project.name.ilike(f"%{search}%")) |
            (Project.client_name.ilike(f"%{search}%")) |
            (Project.location.ilike(f"%{search}%"))
        )
    total = query.count()
    projects = query.order_by(Project.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": projects, "total": total, "page": page, "size": size}


from app.models.project_task import ProjectTask
from app.models.project import ProjectType

@router.post("/", response_model=ProjectResponse, status_code=201)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        **data.model_dump(),
        created_by=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Auto-generate tasks based on project type
    tasks_to_create = []
    if project.project_type == ProjectType.RESIDENTIAL:
        tasks_to_create = [
            ("Excavation & Foundation", 15.0),
            ("Framing & Structure", 25.0),
            ("MEP Rough-in", 20.0),
            ("Interior Finishes", 25.0),
            ("Exterior & Landscaping", 15.0),
        ]
    elif project.project_type == ProjectType.COMMERCIAL:
        tasks_to_create = [
            ("Site Preparation", 10.0),
            ("Core & Shell", 30.0),
            ("MEP Infrastructure", 25.0),
            ("Tenant Build-out", 25.0),
            ("Testing & Commissioning", 10.0),
        ]

    for name, weight in tasks_to_create:
        task = ProjectTask(
            project_id=project.id,
            name=name,
            weight_percentage=weight
        )
        db.add(task)
    
    if tasks_to_create:
        db.commit()

    return project



@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Super admin and company owner see everything
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER]:
        return project

    # Client can only see their own projects
    if current_user.role == UserRole.CLIENT:
        if project.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this project")
        return project

    # For all other roles: allow if they created it OR they are an assigned member
    is_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if project.created_by != current_user.id and not is_member:
        raise HTTPException(status_code=403, detail="Not authorized to view this project")

    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role != UserRole.SUPER_ADMIN and project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this project")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.role != UserRole.SUPER_ADMIN and project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
        
    db.delete(project)
    db.commit()


@router.post("/{project_id}/archive")
def archive_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.role != UserRole.SUPER_ADMIN and project.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to archive this project")

    project.is_archived = True
    project.status = ProjectStatus.ARCHIVED
    db.commit()
    return {"message": "Project archived successfully"}


@router.post("/{project_id}/blocks", response_model=ProjectBlockResponse, status_code=201)
def create_block(
    project_id: int,
    data: ProjectBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    block = ProjectBlock(project_id=project_id, **data.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.get("/{project_id}/blocks", response_model=list[ProjectBlockResponse])
def list_blocks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    blocks = db.query(ProjectBlock).filter(ProjectBlock.project_id == project_id).all()
    return blocks


@router.post("/{project_id}/structures", response_model=ProjectStructureResponse, status_code=201)
def create_structure(
    project_id: int,
    data: ProjectStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    structure = ProjectStructure(project_id=project_id, **data.model_dump())
    db.add(structure)
    db.commit()
    db.refresh(structure)
    return structure


@router.get("/{project_id}/structures", response_model=list[ProjectStructureResponse])
def list_structures(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    structures = (
        db.query(ProjectStructure)
        .filter(ProjectStructure.project_id == project_id, ProjectStructure.parent_id.is_(None))
        .all()
    )
    return structures


@router.get("/{project_id}/stats")
def project_stats(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.workforce import DailyLabourSummary
    from app.models.financial import CostRecord
    from app.models.daily_progress import DailyWorkLog

    total_workers = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).filter(
        DailyLabourSummary.project_id == project_id
    ).scalar() or 0

    total_cost = db.query(func.coalesce(func.sum(CostRecord.amount), 0)).filter(
        CostRecord.project_id == project_id
    ).scalar() or 0

    today_logs = db.query(func.count(DailyWorkLog.id)).filter(
        DailyWorkLog.project_id == project_id,
        func.date(DailyWorkLog.date) == func.current_date()
    ).scalar() or 0

    return {
        "total_workers": total_workers,
        "total_cost": total_cost,
        "today_logs": today_logs,
    }


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=201)
def add_project_member(
    project_id: int,
    data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user_to_add = db.query(User).filter(User.id == data.user_id).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User to add not found")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    member = ProjectMember(
        project_id=project_id,
        user_id=data.user_id,
        role_in_project=data.role_in_project or user_to_add.role.value
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    response = ProjectMemberResponse.model_validate(member)
    response.user_email = user_to_add.email
    response.user_full_name = user_to_add.full_name
    response.user_role = user_to_add.role.value
    return response


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            r = ProjectMemberResponse.model_validate(m)
            r.user_email = user.email
            r.user_full_name = user.full_name
            r.user_role = user.role.value
            result.append(r)
    return result


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER)),
):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="User is not a member of this project")

    db.delete(member)
    db.commit()
