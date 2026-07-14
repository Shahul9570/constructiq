from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import uuid
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStructure, DigitalTwinIssue
from app.services.storage_service import StorageService

router = APIRouter()
storage = StorageService()

@router.get("/projects/{project_id}/digital-twin", response_model=Dict[str, Any])
def get_digital_twin_data(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clients can only view the 3D data for their own linked project
    if current_user.role == UserRole.CLIENT and project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not linked to this project")

    structures = db.query(ProjectStructure).filter(
        ProjectStructure.project_id == project_id,
        ProjectStructure.mesh_node_id.isnot(None)
    ).all()

    mesh_mappings = []
    for structure in structures:
        mesh_mappings.append({
            "structure_id": structure.id,
            "mesh_node_id": structure.mesh_node_id,
            "name": structure.name,
            "progress_percentage": structure.progress_percentage
        })

    return {
        "model_url": project.model_url,
        "mappings": mesh_mappings
    }

@router.post("/projects/{project_id}/digital-twin/upload", status_code=201)
async def upload_digital_twin(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.PROJECT_MANAGER, UserRole.COMPANY_OWNER, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only managers can upload the 3D model")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Upload to storage
    file_ext = os.path.splitext(file.filename or "")[1] if file.filename else ""
    file_key = f"digital-twin/{project_id}/{uuid.uuid4()}{file_ext}"

    file_url = await storage.upload_file(file, file_key)

    # Update project model_url
    project.model_url = file_url
    db.commit()
    db.refresh(project)

    return {"message": "Digital Twin model uploaded successfully", "model_url": file_url}

from pydantic import BaseModel

class SyncStructuresRequest(BaseModel):
    mesh_names: List[str]

@router.post("/projects/{project_id}/digital-twin/sync", status_code=200)
def sync_digital_twin_structures(
    project_id: int,
    request: SyncStructuresRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get existing structures
    existing_structures = db.query(ProjectStructure).filter(
        ProjectStructure.project_id == project_id,
        ProjectStructure.mesh_node_id.isnot(None)
    ).all()
    
    existing_mesh_ids = {s.mesh_node_id for s in existing_structures}
    request_mesh_ids = set(request.mesh_names)
    
    new_structures = []
    for mesh_name in request_mesh_ids:
        if mesh_name not in existing_mesh_ids:
            # Create new flat structure
            structure = ProjectStructure(
                project_id=project_id,
                name=mesh_name,
                mesh_node_id=mesh_name,
                level=0
            )
            new_structures.append(structure)
    
    if new_structures:
        db.add_all(new_structures)

    # 2. Remove orphaned structures (from old models)
    orphans = [s for s in existing_structures if s.mesh_node_id not in request_mesh_ids]
    for orphan in orphans:
        db.delete(orphan)

    db.commit()

    return {
        "message": f"Successfully synced structures. Added {len(new_structures)}, Removed {len(orphans)}.",
        "added": len(new_structures),
        "removed": len(orphans),
        "total": len(request_mesh_ids)
    }

class UpdateProgressRequest(BaseModel):
    progress_percentage: float

@router.patch("/projects/{project_id}/digital-twin/structures/{mesh_node_id}", status_code=200)
def update_structure_progress(
    project_id: int,
    mesh_node_id: str,
    request: UpdateProgressRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    structure = db.query(ProjectStructure).filter(
        ProjectStructure.project_id == project_id,
        ProjectStructure.mesh_node_id == mesh_node_id
    ).first()
    
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")
        
    if request.progress_percentage < 0 or request.progress_percentage > 100:
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
        
    structure.progress_percentage = request.progress_percentage
    db.commit()
    db.refresh(structure)
    
    return {"message": "Progress updated successfully", "progress_percentage": structure.progress_percentage}

class UpdateNameRequest(BaseModel):
    name: str

@router.patch("/projects/{project_id}/digital-twin/structures/{mesh_node_id}/name", status_code=200)
def update_structure_name(
    project_id: int,
    mesh_node_id: str,
    request: UpdateNameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    structure = db.query(ProjectStructure).filter(
        ProjectStructure.project_id == project_id,
        ProjectStructure.mesh_node_id == mesh_node_id
    ).first()

    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")

    structure.name = request.name.strip()
    db.commit()
    db.refresh(structure)
    
    return {"message": "Name updated successfully", "name": structure.name}

class PromptRequest(BaseModel):
    prompt: str

@router.post("/projects/{project_id}/digital-twin/prompt", status_code=200)
def process_digital_twin_prompt(
    project_id: int,
    request: PromptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    structures = db.query(ProjectStructure).filter(
        ProjectStructure.project_id == project_id,
        ProjectStructure.mesh_node_id.isnot(None)
    ).all()

    if not structures:
        raise HTTPException(status_code=400, detail="No structures found for this project.")

    from app.services.ai_service import AIService
    ai_service = AIService()

    try:
        updates = ai_service.parse_progress_prompt(request.prompt, structures)
        
        updated_count = 0
        for update in updates:
            mesh_node_id = update.get("mesh_node_id")
            progress = update.get("progress_percentage")
            
            if mesh_node_id and progress is not None:
                # Find matching structure
                structure = next((s for s in structures if s.mesh_node_id == mesh_node_id), None)
                if structure:
                    structure.progress_percentage = max(0, min(100, float(progress)))
                    updated_count += 1
        
        if updated_count > 0:
            db.commit()

        return {
            "message": f"Successfully updated {updated_count} structures based on your prompt.",
            "updated_count": updated_count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/projects/{project_id}/digital-twin/auto-rename", status_code=200)
def auto_rename_structures(
    project_id: int,
    body: dict = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Use AI to bulk-rename all structures to human-readable BIM labels."""
    from fastapi import Body
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    structures = db.query(ProjectStructure).filter(
        ProjectStructure.project_id == project_id,
        ProjectStructure.mesh_node_id.isnot(None)
    ).all()

    if not structures:
        raise HTTPException(status_code=400, detail="No structures found.")

    geometry = (body or {}).get("geometry", {})

    from app.services.ai_service import AIService
    ai_service = AIService()

    try:
        name_map = ai_service.auto_rename_structures(structures, geometry)
        updated = 0
        for structure in structures:
            new_name = name_map.get(structure.mesh_node_id)
            if new_name and new_name.strip():
                structure.name = new_name.strip()
                updated += 1
        db.commit()
        return {"message": f"Successfully renamed {updated} structures.", "updated": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class DigitalTwinIssueCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    mesh_node_id: Optional[str] = None
    position_x: float
    position_y: float
    position_z: float
    assigned_to_id: Optional[int] = None

class DigitalTwinIssueUpdate(BaseModel):
    status: Optional[str] = None

@router.get("/projects/{project_id}/digital-twin/issues", status_code=200)
def get_digital_twin_issues(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    query = db.query(DigitalTwinIssue).filter(DigitalTwinIssue.project_id == project_id)
    
    if current_user.role == UserRole.CONTRACTOR:
        query = query.filter(DigitalTwinIssue.assigned_to_id == current_user.id)
        
    issues = query.all()
    
    return [
        {
            "id": issue.id,
            "title": issue.title,
            "description": issue.description,
            "status": issue.status,
            "priority": issue.priority,
            "mesh_node_id": issue.mesh_node_id,
            "position": {"x": issue.position_x, "y": issue.position_y, "z": issue.position_z},
            "created_at": issue.created_at,
            "created_by": issue.created_by.full_name if issue.created_by else "Unknown",
            "assigned_to": {
                "id": issue.assigned_to.id,
                "name": issue.assigned_to.full_name,
                "role": issue.assigned_to.role
            } if issue.assigned_to else None
        }
        for issue in issues
    ]

@router.post("/projects/{project_id}/digital-twin/issues", status_code=201)
def create_digital_twin_issue(
    project_id: int,
    request: DigitalTwinIssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in [UserRole.CLIENT, UserRole.CONTRACTOR]:
        raise HTTPException(status_code=403, detail="Not authorized to create issues")
        
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    new_issue = DigitalTwinIssue(
        project_id=project_id,
        title=request.title,
        description=request.description,
        priority=request.priority,
        mesh_node_id=request.mesh_node_id,
        position_x=request.position_x,
        position_y=request.position_y,
        position_z=request.position_z,
        assigned_to_id=request.assigned_to_id,
        created_by_id=current_user.id
    )
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    
    return {"message": "Issue created", "id": new_issue.id}

@router.patch("/projects/{project_id}/digital-twin/issues/{issue_id}", status_code=200)
def update_digital_twin_issue(
    project_id: int,
    issue_id: int,
    request: DigitalTwinIssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Clients cannot update issues")
        
    issue = db.query(DigitalTwinIssue).filter(
        DigitalTwinIssue.id == issue_id,
        DigitalTwinIssue.project_id == project_id
    ).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if request.status:
        # Contractor validation
        if current_user.role == UserRole.CONTRACTOR:
            if issue.assigned_to_id != current_user.id:
                raise HTTPException(status_code=403, detail="Can only update issues assigned to you")
            if request.status != "completed":
                raise HTTPException(status_code=403, detail="Contractors can only mark issues as completed")
        
        # Manager verification auto-update
        if request.status == "verified" and current_user.role in [UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.COMPANY_OWNER, UserRole.SUPER_ADMIN]:
            if issue.mesh_node_id:
                structure = db.query(ProjectStructure).filter(
                    ProjectStructure.project_id == project_id,
                    ProjectStructure.mesh_node_id == issue.mesh_node_id
                ).first()
                if structure:
                    structure.progress_percentage = 100.0
                    
        issue.status = request.status
        
    db.commit()
    
    return {"message": "Issue updated"}
