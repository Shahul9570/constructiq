import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.project_task import ProjectTask
from app.core.security import hash_password

def create_super_admin():
    db = SessionLocal()
    email = "admin@constructiq.com"
    username = "superadmin"
    
    admin = db.query(User).filter(User.email == email).first()
    if admin:
        admin.hashed_password = hash_password("admin123")
        admin.role = UserRole.SUPER_ADMIN
        admin.is_active = True
        admin.is_verified = True
        db.commit()
        print("Updated existing admin account.")
    else:
        admin = User(
            email=email,
            username=username,
            hashed_password=hash_password("admin123"),  # Default password
            full_name="Construct IQ Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_verified=True
        )
        db.add(admin)
        db.commit()
        print("Successfully created Super Admin!")
        
    print(f"Email: {email}")
    print(f"Password: admin123")
    
if __name__ == "__main__":
    create_super_admin()
