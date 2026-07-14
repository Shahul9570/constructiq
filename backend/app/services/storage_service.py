import os
import uuid
from typing import Optional
from fastapi import UploadFile

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.use_s3 = all([
            settings.S3_ENDPOINT,
            settings.S3_ACCESS_KEY,
            settings.S3_SECRET_KEY,
        ])
        if self.use_s3:
            import boto3
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name=settings.S3_REGION,
            )
            self.bucket_name = settings.S3_BUCKET_NAME
            self._ensure_bucket()
        else:
            os.makedirs("uploads", exist_ok=True)

    def _ensure_bucket(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except Exception as e:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            except Exception as creation_error:
                print(f"Warning: Could not connect to S3 ({creation_error}). Falling back to local storage.")
                self.use_s3 = False
                os.makedirs("uploads", exist_ok=True)

    async def upload_file(self, file: UploadFile, key: Optional[str] = None) -> str:
        if not key:
            ext = os.path.splitext(file.filename or "")[1] if file.filename else ""
            key = f"uploads/{uuid.uuid4()}{ext}"

        content = await file.read()

        if self.use_s3:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content,
                ContentType=file.content_type,
            )
            return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{key}"
        else:
            from app.core.database import SessionLocal
            from app.models.blob import FileBlob
            db = SessionLocal()
            try:
                blob = FileBlob(
                    id=key,
                    filename=file.filename,
                    content_type=file.content_type,
                    data=content
                )
                db.add(blob)
                db.commit()
            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()
            return f"/api/v1/blobs/{key}"

    def delete_file(self, url: str) -> bool:
        try:
            if self.use_s3 and settings.S3_ENDPOINT in url:
                key = url.replace(f"{settings.S3_ENDPOINT}/{self.bucket_name}/", "")
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            else:
                key = url.replace("/api/v1/blobs/", "")
                from app.core.database import SessionLocal
                from app.models.blob import FileBlob
                db = SessionLocal()
                try:
                    blob = db.query(FileBlob).filter(FileBlob.id == key).first()
                    if blob:
                        db.delete(blob)
                        db.commit()
                finally:
                    db.close()
            return True
        except Exception:
            return False

    def get_file_url(self, key: str) -> str:
        if self.use_s3:
            return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{key}"
        return f"/api/v1/blobs/{key}"
