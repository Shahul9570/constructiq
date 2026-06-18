import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.project import Project, ProjectBlock, ProjectStructure
from app.models.workforce import DailyLabourSummary
from app.models.contractor import Contractor, ContractorPayment
from app.models.material import Material, MaterialArrival, MaterialConsumption
from app.models.equipment import Equipment
from app.models.daily_progress import DailyWorkLog
from app.models.financial import CostRecord, Invoice
from app.models.document import Document
from app.models.photo import Photo

def clear_all_mock_data():
    db = SessionLocal()
    try:
        # Delete in order to respect foreign keys
        db.query(CostRecord).delete()
        db.query(Invoice).delete()
        db.query(DailyWorkLog).delete()
        db.query(MaterialArrival).delete()
        db.query(MaterialConsumption).delete()
        db.query(Material).delete()
        db.query(Equipment).delete()
        db.query(Document).delete()
        db.query(Photo).delete()
        db.query(DailyLabourSummary).delete()
        db.query(ContractorPayment).delete()
        db.query(Contractor).delete()
        db.query(ProjectBlock).delete()
        db.query(ProjectStructure).delete()
        db.query(Project).delete()
        
        db.commit()
        print("Successfully removed all mock project data.")
        print("User accounts remain active.")
    except Exception as e:
        db.rollback()
        print(f"Error removing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_mock_data()
