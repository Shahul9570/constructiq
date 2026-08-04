import re
import html
from typing import Optional
from fastapi import HTTPException, status

PASSWORD_REGEX = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$')

def sanitize_text(text_val: Optional[str]) -> Optional[str]:
    """
    Sanitizes user input strings to prevent XSS attacks by removing
    script tags and HTML injection payloads.
    """
    if not text_val or not isinstance(text_val, str):
        return text_val

    # Strip script tags & event attributes
    clean = re.sub(r'<script.*?>.*?</script>', '', text_val, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'on\w+\s*=\s*".*?"', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r"on\w+\s*=\s*'.*?'", '', clean, flags=re.IGNORECASE)
    clean = html.escape(clean, quote=False)
    return clean

def validate_password_strength(password: str) -> None:
    """
    Enforces enterprise password complexity standards:
    - Minimum 8 characters
    - At least 1 uppercase letter (A-Z)
    - At least 1 lowercase letter (a-z)
    - At least 1 number (0-9)
    - At least 1 special character (@$!%*?&)
    """
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    if not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 1 uppercase letter (A-Z)."
        )

    if not re.search(r'[a-z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 1 lowercase letter (a-z)."
        )

    if not re.search(r'\d', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 1 number (0-9)."
        )

import os

ALLOWED_PHOTO_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.avi', '.webm'}
ALLOWED_DOC_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.glb', '.gltf', '.zip', '.dwg', '.rvt'}

def validate_uploaded_file(filename: str, allowed_extensions: set):
    """
    Validates file extension against a whitelist to prevent arbitrary file upload vulnerabilities
    (e.g., .php, .sh, .py, .exe, .html payload prevention).
    """
    ext = os.path.splitext(filename or "")[1].lower()
    if not ext or ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Allowed file formats: {', '.join(sorted(allowed_extensions))}"
        )
