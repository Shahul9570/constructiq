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
        # In a real scenario, progress would be calculated from tasks or work logs
        # For this prototype, we'll return a simulated progress if it's missing
        mesh_mappings.append({
            "structure_id": structure.id,
            "mesh_node_id": structure.mesh_node_id,
            "name": structure.name,
            "progress_percentage": 50.0  # Simulated progress for Phase 1
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
