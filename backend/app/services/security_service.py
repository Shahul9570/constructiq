import time
import logging
from typing import Dict, Tuple
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Memory-backed Rate Limiter for Login Protection
# Schema: { identifier_key: (failed_attempts: int, lock_until_timestamp: float) }
_LOGIN_ATTEMPTS: Dict[str, Tuple[int, float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes

def check_login_rate_limit(identifier: str):
    """
    Checks if an IP address or username is currently locked out due to brute-force attempts.
    """
    now = time.time()
    if identifier in _LOGIN_ATTEMPTS:
        attempts, lock_until = _LOGIN_ATTEMPTS[identifier]
        if now < lock_until:
            remaining_mins = int((lock_until - now) / 60) + 1
            logger.warning(f"Blocked brute-force login attempt for '{identifier}'. Locked for {remaining_mins} mins.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked due to 5 consecutive failed login attempts. Please try again in {remaining_mins} minutes."
            )
        elif attempts >= MAX_FAILED_ATTEMPTS:
            # Lockout period expired, reset counter
            _LOGIN_ATTEMPTS.pop(identifier, None)

def record_failed_login(identifier: str):
    """
    Increments failed login counter and triggers a 15-minute lock upon reaching 5 failures.
    """
    now = time.time()
    attempts, lock_until = _LOGIN_ATTEMPTS.get(identifier, (0, 0.0))
    attempts += 1

    if attempts >= MAX_FAILED_ATTEMPTS:
        lock_until = now + LOCKOUT_DURATION_SECONDS
        logger.warning(f"Locking identifier '{identifier}' for 15 minutes due to {attempts} failed login attempts.")
    
    _LOGIN_ATTEMPTS[identifier] = (attempts, lock_until)

def clear_failed_login(identifier: str):
    """
    Resets failed login counter upon successful authentication.
    """
    _LOGIN_ATTEMPTS.pop(identifier, None)
