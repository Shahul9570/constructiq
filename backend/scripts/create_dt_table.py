import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from app.core.config import settings
from app.models.project import DigitalTwinModel
from app.core.database import Base

print("Creating DigitalTwinModel table...")
engine = create_engine(settings.DATABASE_URL)
DigitalTwinModel.__table__.create(engine, checkfirst=True)
print("Done!")
