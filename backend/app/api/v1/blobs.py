from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.blob import FileBlob
import urllib.parse

router = APIRouter()

@router.get("/{key:path}")
def get_blob(key: str, db: Session = Depends(get_db)):
    blob = db.query(FileBlob).filter(FileBlob.id == key).first()
    if not blob:
        raise HTTPException(status_code=404, detail="File not found")

    headers = {
        "Content-Disposition": f'inline; filename="{urllib.parse.quote(blob.filename or "file")}"'
    }
    
    return Response(
        content=blob.data,
        media_type=blob.content_type or "application/octet-stream",
        headers=headers
    )
