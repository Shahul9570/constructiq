import sys
import os

# Ensure the app module can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/backend")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.workforce import DailyLabourSummary
from app.models.material import MaterialArrival, Material
from sqlalchemy import func

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- Data Check ---")
labour = db.query(DailyLabourSummary).all()
print(f"DailyLabourSummary count: {len(labour)}")
for l in labour:
    print(f" - Project {l.project_id}, workers: {l.workers_count}, rate: {l.daily_rate}")

arrivals = db.query(MaterialArrival).all()
print(f"MaterialArrival count: {len(arrivals)}")
for a in arrivals:
    mat = db.query(Material).filter(Material.id == a.material_id).first()
    print(f" - Material {a.material_id} (Project {mat.project_id if mat else 'NONE'}), qty: {a.quantity}, invoice: {a.invoice_amount}, unit_price: {mat.unit_price if mat else 'NONE'}")

db.close()
