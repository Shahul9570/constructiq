from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
import uuid
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.photo import Photo
from app.services.storage_service import StorageService
from datetime import date

router = APIRouter()
storage = StorageService()


@router.get("/")
def list_photos(
    project_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    area: Optional[str] = None,
    activity: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Photo).filter(Photo.project_id == project_id)
    if area:
        query = query.filter(Photo.area.ilike(f"%{area}%"))
    if activity:
        query = query.filter(Photo.activity.ilike(f"%{activity}%"))
    if date_from:
        query = query.filter(Photo.photo_date >= date_from)
    if date_to:
        query = query.filter(Photo.photo_date <= date_to)
    total = query.count()
    photos = query.order_by(Photo.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": photos, "total": total, "page": page, "size": size}


@router.post("/upload", status_code=201)
async def upload_photo(
    project_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    area: Optional[str] = Form(None),
    activity: Optional[str] = Form(None),
    photo_date: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_ext = os.path.splitext(file.filename or "")[1] if file.filename else ".jpg"
    is_video = file.content_type and file.content_type.startswith("video/")
    prefix = "videos" if is_video else "photos"
    file_key = f"{prefix}/{project_id}/{uuid.uuid4()}{file_ext}"

    file_url = await storage.upload_file(file, file_key)

    photo = Photo(
        project_id=project_id,
        file_url=file_url,
        caption=caption,
        area=area,
        activity=activity,
        photo_date=photo_date or date.today(),
        file_size=file.size,
        file_type=file.content_type,
        is_video=is_video,
        uploaded_by=current_user.id,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}", status_code=204)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    storage.delete_file(photo.file_url)
    db.delete(photo)
    db.commit()
