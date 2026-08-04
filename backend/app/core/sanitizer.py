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

    if not re.search(r'[@$!%*?&#^()_+\-=\[\]{};:\'",.<>/\\]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 1 special character (e.g. @, $, !, %, *, ?, &)."
        )
