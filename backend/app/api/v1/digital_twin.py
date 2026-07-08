from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectStructure

router = APIRouter()

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
