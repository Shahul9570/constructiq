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
        except Exception:
            self.s3_client.create_bucket(Bucket=self.bucket_name)

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
            local_path = f"uploads/{key}"
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(content)
            return f"/{local_path}"

    def delete_file(self, url: str) -> bool:
        try:
            if self.use_s3 and settings.S3_ENDPOINT in url:
                key = url.replace(f"{settings.S3_ENDPOINT}/{self.bucket_name}/", "")
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            else:
                local_path = url.lstrip("/")
                if os.path.exists(local_path):
                    os.remove(local_path)
            return True
        except Exception:
            return False

    def get_file_url(self, key: str) -> str:
        if self.use_s3:
            return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{key}"
        return f"/uploads/{key}"
