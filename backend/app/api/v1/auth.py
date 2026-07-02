from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user, oauth2_scheme
)
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate, UserResponse, UserLogin, TokenResponse,
    RefreshTokenRequest, PasswordChange, UserUpdate
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    # Block direct super_admin registration
    if data.role and data.role.lower() == UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot register as a super admin via this endpoint"
        )

    # Staff roles CAN provide a company_code to link to their Company Owner (optional)
    staff_roles = {UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.CONTRACTOR, UserRole.ACCOUNTANT}
    company_owner_id = None
    if data.role in [r.value for r in staff_roles] and data.company_code:
        owner = db.query(User).filter(User.company_code == data.company_code.upper()).first()
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid Company Code. Please check the code with your Company Owner."
            )
        company_owner_id = owner.id

    existing = db.query(User).filter(
        (User.email == data.email) | (User.username == data.username)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole(data.role) if hasattr(UserRole, data.role.upper()) else UserRole.SITE_ENGINEER,
        company_name=data.company_name,
        company_owner_id=company_owner_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-generate company_code for Company Owners after we have their ID
    if user.role == UserRole.COMPANY_OWNER:
        user.company_code = f"CO-{user.id:04d}"
        db.commit()
        db.refresh(user)

    return user


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == data.username) | (User.email == data.username)
    ).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

from app.core.security import require_roles

@router.delete("/system/wipe-mock-data", status_code=status.HTTP_200_OK)
def wipe_mock_data(
    current_user: User = Depends(require_roles("company_owner")),
):
    """
    DANGEROUS: Wipes all mock data from the database.
    Only accessible by users with 'owner' role.
    """
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from scripts.clear_data import clear_all_mock_data
    
    clear_all_mock_data()
    return {"message": "All mock data has been wiped successfully."}

@router.get("/system/bootstrap-admin", status_code=status.HTTP_200_OK)
def bootstrap_admin(db: Session = Depends(get_db)):
    """
    Bootstraps the initial Super Admin account if it doesn't exist.
    """
    admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    if admin:
        admin.hashed_password = hash_password("Admin@123")
        admin.is_active = True
        db.commit()
        return {"message": "Admin already exists. Password reset to Admin@123", "email": admin.email}
        
    admin = User(
        email="admin@constructiq.com",
        username="admin",
        hashed_password=hash_password("Admin@123"),
        full_name="Super Admin",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return {"message": "Super Admin account created successfully", "email": admin.email}
