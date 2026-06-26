import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.abspath("/home/ciods/Shahul/projects/construct-iq/backend"))

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        print("Adding company_id column...")
        conn.execute(text("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES users(id)"))
        print("Dropping NOT NULL constraint on project_id...")
        conn.execute(text("ALTER TABLE equipment ALTER COLUMN project_id DROP NOT NULL"))
        print("Done!")
except Exception as e:
    print(f"Error: {e}")
