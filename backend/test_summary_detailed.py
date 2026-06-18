import sys
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.workforce import DailyLabourSummary
from app.models.material import MaterialArrival, Material
from app.models.project import Project
from sqlalchemy import func

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- Projects ---")
projects = db.query(Project).all()
for p in projects:
    print(f"Project ID: {p.id}, Name: {p.name}")

print("\n--- Labour ---")
labour = db.query(DailyLabourSummary).all()
for l in labour:
    print(f"Project ID: {l.project_id}, workers: {l.workers_count}, rate: {l.daily_rate}")

print("\n--- Materials ---")
arrivals = db.query(MaterialArrival).all()
for a in arrivals:
    mat = db.query(Material).filter(Material.id == a.material_id).first()
    print(f"Project ID: {mat.project_id if mat else 'NONE'} (Material ID: {a.material_id}), qty: {a.quantity}, invoice: {a.invoice_amount}")

db.close()
