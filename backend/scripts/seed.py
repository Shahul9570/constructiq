"""Seed script to populate the database with initial data for testing."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
from datetime import date, timedelta
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.project import Project, ProjectBlock, ProjectStructure, ProjectStatus
from app.models.workforce import DailyLabourSummary, TradeType
from app.models.contractor import Contractor, ContractorPayment, PaymentStatus
from app.models.material import Material, MaterialType, UnitType, MaterialArrival, MaterialConsumption
from app.models.equipment import Equipment, EquipmentType, EquipmentStatus
from app.models.daily_progress import DailyWorkLog
from app.models.financial import CostRecord, CostCategory


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create users
        users_data = [
            {"email": "admin@constructiq.com", "username": "admin", "password": "Admin@123", "full_name": "Super Admin", "role": UserRole.SUPER_ADMIN},
            {"email": "owner@constructiq.com", "username": "owner", "password": "Owner@123", "full_name": "Company Owner", "role": UserRole.COMPANY_OWNER},
            {"email": "manager@constructiq.com", "username": "manager", "password": "Manager@123", "full_name": "Project Manager", "role": UserRole.PROJECT_MANAGER},
            {"email": "engineer@constructiq.com", "username": "engineer", "password": "Engineer@123", "full_name": "Site Engineer", "role": UserRole.SITE_ENGINEER},
            {"email": "accountant@constructiq.com", "username": "accountant", "password": "Account@123", "full_name": "Accountant", "role": UserRole.ACCOUNTANT},
        ]

        users = []
        for u_data in users_data:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                user = User(
                    email=u_data["email"],
                    username=u_data["username"],
                    hashed_password=hash_password(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                db.flush()
                users.append(user)
                print(f"Created user: {user.email}")
            else:
                users.append(existing)

        # Create projects
        projects_data = [
            {
                "name": "Green Valley Residential Complex",
                "client_name": "Green Valley Developers",
                "location": "Sector 45, Gurgaon, Haryana",
                "description": "A premium residential complex with 4 towers of 15 floors each",
                "start_date": date(2024, 1, 15),
                "expected_end_date": date(2025, 6, 30),
                "budget": 45000000.00,
                "status": ProjectStatus.IN_PROGRESS,
                "progress_percentage": 45.0,
            },
            {
                "name": "Tech Park Office Building",
                "client_name": "TechPark Infrastructure",
                "location": "Whitefield, Bangalore, Karnataka",
                "description": "Commercial office building with G+10 floors",
                "start_date": date(2024, 3, 1),
                "expected_end_date": date(2025, 9, 15),
                "budget": 85000000.00,
                "status": ProjectStatus.IN_PROGRESS,
                "progress_percentage": 30.0,
            },
            {
                "name": "Riverside Township Phase 1",
                "client_name": "Riverside Developers Ltd",
                "location": "Kharar, Mohali, Punjab",
                "description": "Residential township with 200 units",
                "start_date": date(2023, 6, 1),
                "expected_end_date": date(2024, 12, 31),
                "budget": 120000000.00,
                "status": ProjectStatus.IN_PROGRESS,
                "progress_percentage": 75.0,
            },
        ]

        projects = []
        for p_data in projects_data:
            project = Project(
                **p_data,
                created_by=users[2].id,  # Manager
            )
            db.add(project)
            db.flush()
            projects.append(project)
            print(f"Created project: {project.name}")

            # Add blocks
            blocks = [
                ProjectBlock(project_id=project.id, name="Foundation", block_type="foundation", progress_percentage=p_data["progress_percentage"] * 0.9),
                ProjectBlock(project_id=project.id, name="Structure - Tower A", block_type="building", progress_percentage=p_data["progress_percentage"]),
                ProjectBlock(project_id=project.id, name="Structure - Tower B", block_type="building", progress_percentage=p_data["progress_percentage"] * 0.7),
                ProjectBlock(project_id=project.id, name="Electrical", block_type="electrical", progress_percentage=p_data["progress_percentage"] * 0.5),
                ProjectBlock(project_id=project.id, name="Plumbing", block_type="plumbing", progress_percentage=p_data["progress_percentage"] * 0.4),
            ]
            for block in blocks:
                db.add(block)
            db.flush()

        # Create contractors
        contractors_data = [
            {"name": "Raj Construction", "company_name": "Raj Constructions Pvt Ltd", "phone": "+91-9876543210", "trade": "mason", "team_size": 25, "contract_amount": 5000000, "project_id": projects[0].id},
            {"name": "Singh Electricals", "company_name": "Singh Electrical Works", "phone": "+91-9876543211", "trade": "electrician", "team_size": 10, "contract_amount": 2000000, "project_id": projects[0].id},
            {"name": "Kumar Plumbers", "company_name": "Kumar Plumbing Solutions", "phone": "+91-9876543212", "trade": "plumber", "team_size": 8, "contract_amount": 1500000, "project_id": projects[1].id},
            {"name": "Patel Steel Works", "company_name": "Patel Steel Fabricators", "phone": "+91-9876543213", "trade": "carpenter", "team_size": 15, "contract_amount": 3500000, "project_id": projects[1].id},
        ]

        contractors = []
        for c_data in contractors_data:
            contractor = Contractor(
                **c_data,
                paid_amount=c_data["contract_amount"] * 0.6,
                pending_amount=c_data["contract_amount"] * 0.4,
                rating=4.2,
            )
            db.add(contractor)
            db.flush()
            contractors.append(contractor)

        # Create daily labour summaries (last 30 days)
        trades = [TradeType.MASON, TradeType.CARPENTER, TradeType.ELECTRICIAN, TradeType.PLUMBER, TradeType.PAINTER, TradeType.HELPER]
        for project in projects:
            for day_offset in range(30):
                att_date = date.today() - timedelta(days=day_offset)
                if att_date.weekday() >= 6:  # Skip Sundays
                    continue
                    
                # Create 2-4 trade entries per day per project
                daily_trades = random.sample(trades, random.randint(2, 4))
                for i, trade in enumerate(daily_trades):
                    # Assign contractor randomly
                    contractor = random.choice(contractors) if random.random() > 0.3 else None
                    workers_count = random.randint(2, 15)
                    base_rate = 500 if trade == TradeType.HELPER else 800
                    
                    summary = DailyLabourSummary(
                        project_id=project.id,
                        date=att_date,
                        trade=trade,
                        workers_count=workers_count,
                        daily_rate=base_rate + random.randint(0, 200),
                        contractor_id=contractor.id if contractor else None,
                        created_by=users[3].id,
                        remarks=f"Regular work for {trade.value}"
                    )
                    db.add(summary)
            db.flush()

        # Create materials
        material_configs = [
            {"name": "Portland Cement", "material_type": MaterialType.CEMENT, "unit": UnitType.BAGS, "stock": 500, "reorder": 100, "price": 350},
            {"name": "TMT Steel Bars 12mm", "material_type": MaterialType.STEEL, "unit": UnitType.KG, "stock": 5000, "reorder": 1000, "price": 72},
            {"name": "River Sand", "material_type": MaterialType.SAND, "unit": UnitType.CUBIC_FT, "stock": 200, "reorder": 50, "price": 35},
            {"name": "20mm Coarse Aggregate", "material_type": MaterialType.AGGREGATE, "unit": UnitType.CUBIC_FT, "stock": 150, "reorder": 40, "price": 30},
            {"name": "Clay Bricks", "material_type": MaterialType.BRICKS, "unit": UnitType.NUMBERS, "stock": 10000, "reorder": 2000, "price": 8},
            {"name": "White Paint", "material_type": MaterialType.PAINT, "unit": UnitType.LITERS, "stock": 50, "reorder": 20, "price": 250},
        ]

        all_materials = []
        for project in projects:
            for m_data in material_configs:
                material = Material(
                    project_id=project.id,
                    name=m_data["name"],
                    material_type=m_data["material_type"],
                    unit=m_data["unit"],
                    current_stock=m_data["stock"],
                    reorder_level=m_data["reorder"],
                    unit_price=m_data["price"],
                    supplier_name="BuildMart Supplies",
                    supplier_contact="+91-9876500000",
                )
                db.add(material)
                db.flush()
                all_materials.append(material)

        # Add material arrivals and consumptions
        for material in all_materials[:6]:
            arrival = MaterialArrival(
                material_id=material.id,
                quantity=material.current_stock,
                supplier_name="BuildMart Supplies",
                invoice_number=f"INV-{material.id:04d}",
                invoice_amount=material.current_stock * material.unit_price,
                arrival_date=date.today() - timedelta(days=random.randint(1, 30)),
                received_by=users[3].id,
            )
            db.add(arrival)

            consumption = MaterialConsumption(
                material_id=material.id,
                quantity=material.current_stock * 0.3,
                area="Tower A - Floor 3",
                work_area="Slab Casting",
                consumption_date=date.today() - timedelta(days=random.randint(1, 15)),
                used_by=users[3].id,
            )
            db.add(consumption)

        # Create daily work logs
        areas = ["Foundation", "Tower A - Floor 1", "Tower A - Floor 2", "Tower B - Floor 1", "Parking Area"]
        activities = ["Slab Casting", "Column Reinforcement", "Brickwork", "Plastering", "Electrical Wiring", "Plumbing Work"]

        for project in projects:
            for day_offset in range(10):
                log_date = date.today() - timedelta(days=day_offset)
                if log_date.weekday() >= 6:
                    continue
                for _ in range(random.randint(2, 4)):
                    planned = random.uniform(100, 1000)
                    completed = planned * random.uniform(0.7, 1.1)
                    log = DailyWorkLog(
                        project_id=project.id,
                        date=log_date,
                        area=random.choice(areas),
                        activity=random.choice(activities),
                        planned_quantity=round(planned, 2),
                        completed_quantity=round(completed, 2),
                        unit="sq.ft",
                        labour_hours=random.uniform(8, 16),
                        workers_count=random.randint(5, 20),
                        created_by=users[3].id,
                    )
                    db.add(log)

        # Create cost records
        categories = [CostCategory.LABOUR, CostCategory.MATERIAL, CostCategory.EQUIPMENT, CostCategory.CONTRACTOR, CostCategory.OVERHEAD]
        for project in projects:
            for day_offset in range(30):
                cost_date = date.today() - timedelta(days=day_offset)
                if cost_date.weekday() >= 6:
                    continue
                for _ in range(random.randint(1, 3)):
                    cost = CostRecord(
                        project_id=project.id,
                        category=random.choice(categories),
                        description=f"Daily expense for {cost_date}",
                        amount=random.uniform(5000, 100000),
                        date=cost_date,
                        created_by=users[2].id,
                    )
                    db.add(cost)

        # Create equipment
        equipment_data = [
            {"name": "JCB Excavator 3DX", "equipment_type": EquipmentType.EXCAVATOR, "hourly_rate": 1200, "total_hours": 450},
            {"name": "Tower Crane TC-6024", "equipment_type": EquipmentType.CRANE, "hourly_rate": 2500, "total_hours": 320},
            {"name": "Concrete Mixer 10/7", "equipment_type": EquipmentType.CONCRETE_MIXER, "hourly_rate": 800, "total_hours": 280},
            {"name": "Dump Truck 20 Ton", "equipment_type": EquipmentType.DUMP_TRUCK, "hourly_rate": 1500, "total_hours": 190},
        ]

        for project in projects:
            for eq_data in equipment_data:
                equipment = Equipment(
                    project_id=project.id,
                    name=eq_data["name"],
                    equipment_type=eq_data["equipment_type"],
                    status=EquipmentStatus.AVAILABLE,
                    hourly_rate=eq_data["hourly_rate"],
                    total_hours_used=eq_data["total_hours"],
                    total_fuel_used=eq_data["total_hours"] * 5,
                    maintenance_interval_days=30,
                    last_maintenance_date=date.today() - timedelta(days=random.randint(10, 25)),
                    next_maintenance_date=date.today() + timedelta(days=random.randint(5, 20)),
                    operator_name="Machine Operator",
                )
                db.add(equipment)
            db.flush()

        db.commit()
        print("\n=== Database seeding complete ===")
        print(f"Users: {len(users)}")
        print(f"Projects: {len(projects)}")
        print(f"Contractors: {len(contractors)}")
        print(f"Materials: {len(all_materials)}")
        print("\nLogin credentials:")
        print("  Admin:     admin / Admin@123")
        print("  Owner:     owner / Owner@123")
        print("  Manager:   manager / Manager@123")
        print("  Engineer:  engineer / Engineer@123")
        print("  Accountant: accountant / Account@123")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
