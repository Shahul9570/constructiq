from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.services.storage_service import StorageService

router = APIRouter()
storage = StorageService()


@router.get("/")
def list_documents(
    project_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(Document.project_id == project_id)
    if category:
        query = query.filter(Document.category == category)
    if search:
        query = query.filter(
            (Document.name.ilike(f"%{search}%")) |
            (Document.tags.ilike(f"%{search}%"))
        )
    total = query.count()
    documents = query.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": documents, "total": total, "page": page, "size": size}


@router.post("/upload", status_code=201)
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_name = name or file.filename
    file_ext = os.path.splitext(file.filename or "")[1] if file.filename else ""
    file_key = f"documents/{project_id}/{uuid.uuid4()}{file_ext}"

    file_url = await storage.upload_file(file, file_key)

    latest = (
        db.query(func.max(Document.version))
        .filter(Document.project_id == project_id, Document.name == doc_name)
        .scalar()
    )
    version = (latest or 0) + 1

    document = Document(
        project_id=project_id,
        name=doc_name,
        file_url=file_url,
        file_size=file.size,
        file_type=file.content_type,
        category=category,
        tags=tags,
        version=version,
        description=description,
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    storage.delete_file(document.file_url)
    db.delete(document)
    db.commit()
