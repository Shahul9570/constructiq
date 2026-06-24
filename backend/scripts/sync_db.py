import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine
from app.models.project import Base, ProjectMember

print("Creating new tables...")
Base.metadata.create_all(bind=engine, tables=[ProjectMember.__table__])
print("Done.")
