from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectStructure
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
