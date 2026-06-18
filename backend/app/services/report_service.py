from io import BytesIO
from typing import Optional
from datetime import date, timedelta
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.project import Project
from app.models.workforce import DailyLabourSummary
from app.models.financial import CostRecord
from app.models.material import Material, MaterialConsumption, MaterialArrival
from app.models.daily_progress import DailyWorkLog
from app.models.equipment import Equipment, EquipmentUsage
from app.models.contractor import Contractor


class ReportService:

    def generate_daily_report(self, project_id: int, report_date: date, db: Session) -> dict:
        work_logs = db.query(DailyWorkLog).filter(
            DailyWorkLog.project_id == project_id,
            DailyWorkLog.date == report_date,
        ).all()

        labour_summaries = db.query(DailyLabourSummary).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.date == report_date,
        ).all()

        costs = db.query(CostRecord).filter(
            CostRecord.project_id == project_id,
            CostRecord.date == report_date,
        ).all()

        equipment_logs = db.query(EquipmentUsage).filter(
            EquipmentUsage.project_id == project_id,
            EquipmentUsage.date == report_date,
        ).all()

        material_arrivals = db.query(MaterialArrival).join(Material).filter(
            Material.project_id == project_id,
            MaterialArrival.arrival_date == report_date,
        ).all()

        material_consumptions = db.query(MaterialConsumption).join(Material).filter(
            Material.project_id == project_id,
            MaterialConsumption.consumption_date == report_date,
        ).all()

        project = db.query(Project).filter(Project.id == project_id).first()

        total_workers = sum(l.workers_count for l in labour_summaries)
        total_wage = sum(l.workers_count * l.daily_rate for l in labour_summaries)

        equipment_total_cost = sum(e.hours_used * e.equipment.hourly_rate for e in equipment_logs)
        material_total_cost = sum(a.invoice_amount if a.invoice_amount else (a.quantity * a.material.unit_price) for a in material_arrivals)
        manual_costs_total = sum(c.amount for c in costs)
        grand_total_cost = total_wage + equipment_total_cost + material_total_cost + manual_costs_total

        return {
            "report_type": "Daily Site Report",
            "project_name": project.name if project else "Unknown",
            "date": str(report_date),
            "total_daily_expense": grand_total_cost,
            "work_logs": [
                {
                    "area": log.area,
                    "activity": log.activity,
                    "planned": log.planned_quantity,
                    "completed": log.completed_quantity,
                    "progress": (log.completed_quantity / log.planned_quantity * 100) if log.planned_quantity > 0 else 0,
                    "workers": log.workers_count,
                    "remarks": log.remarks,
                }
                for log in work_logs
            ],
            "labour": {
                "total_workers": total_workers,
                "total_wage_cost": total_wage,
                "details": [
                    {
                        "trade": l.trade,
                        "workers_count": l.workers_count,
                        "daily_rate": l.daily_rate,
                        "total_cost": l.workers_count * l.daily_rate,
                        "remarks": l.remarks
                    } for l in labour_summaries
                ]
            },
            "equipment_usage": [
                {
                    "equipment": e.equipment.name,
                    "type": e.equipment.equipment_type.value,
                    "hours_used": e.hours_used,
                    "cost": e.hours_used * e.equipment.hourly_rate,
                    "operator": e.operator_name,
                    "work_description": e.work_description,
                } for e in equipment_logs
            ],
            "material_arrivals": [
                {
                    "material": a.material.name,
                    "quantity": a.quantity,
                    "supplier": a.supplier_name,
                    "cost": a.invoice_amount if a.invoice_amount else (a.quantity * a.material.unit_price),
                    "notes": a.notes,
                } for a in material_arrivals
            ],
            "material_consumption": {
                "total_quantity": sum(c.quantity for c in material_consumptions),
                "details": [
                    {
                        "material": c.material.name,
                        "quantity": c.quantity,
                        "area": c.area,
                        "work_area": c.work_area,
                        "notes": c.notes,
                    } for c in material_consumptions
                ]
            },
            "miscellaneous_costs": {
                "total": manual_costs_total,
                "details": [
                    {"category": c.category.value if hasattr(c.category, 'value') else c.category, "amount": c.amount, "description": c.description}
                    for c in costs
                ],
            },
        }

    def generate_weekly_report(self, project_id: int, end_date: date, db: Session) -> dict:
        start_date = end_date - timedelta(days=7)
        daily_data = []
        current = start_date
        while current <= end_date:
            daily = self.generate_daily_report(project_id, current, db)
            daily_data.append(daily)
            current += timedelta(days=1)

        return {
            "report_type": "Weekly Report",
            "period": f"{start_date} to {end_date}",
            "daily_reports": daily_data,
            "summary": {
                "total_cost": sum(d["costs"]["total"] for d in daily_data),
                "total_labour": sum(d["labour"]["total_workers"] for d in daily_data),
                "total_labour_cost": sum(d["labour"]["total_wage_cost"] for d in daily_data),
                "total_material_consumption": sum(d["material_consumption"] for d in daily_data),
            },
        }

    def generate_monthly_report(self, project_id: int, year: int, month: int, db: Session) -> dict:
        from calendar import monthrange
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])

        daily_data = []
        current = start_date
        while current <= end_date:
            daily = self.generate_daily_report(project_id, current, db)
            daily_data.append(daily)
            current += timedelta(days=1)

        return {
            "report_type": "Monthly Report",
            "period": f"{start_date} to {end_date}",
            "daily_reports": daily_data,
            "summary": {
                "total_cost": sum(d["costs"]["total"] for d in daily_data),
                "total_labour": sum(d["labour"]["total_workers"] for d in daily_data),
                "total_labour_cost": sum(d["labour"]["total_wage_cost"] for d in daily_data),
                "total_material_consumption": sum(d["material_consumption"] for d in daily_data),
                "working_days": len([d for d in daily_data if d["work_logs"]]),
            },
        }

    def generate_labour_report(self, project_id: int, date_from: date, date_to: date, db: Session) -> dict:
        labour_summaries = db.query(DailyLabourSummary).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.date >= date_from,
            DailyLabourSummary.date <= date_to,
        ).all()

        total_workers = 0
        total_wage_cost = 0.0
        by_trade = {}
        by_contractor = {}

        for l in labour_summaries:
            cost = l.workers_count * l.daily_rate
            total_workers += l.workers_count
            total_wage_cost += cost
            
            if l.trade not in by_trade:
                by_trade[l.trade] = {"workers": 0, "cost": 0.0}
            by_trade[l.trade]["workers"] += l.workers_count
            by_trade[l.trade]["cost"] += cost
            
            contractor_name = "Direct / Self"
            if l.contractor_id:
                contractor = db.query(Contractor).filter(Contractor.id == l.contractor_id).first()
                if contractor:
                    contractor_name = contractor.name
            
            if contractor_name not in by_contractor:
                by_contractor[contractor_name] = {"workers": 0, "cost": 0.0}
            by_contractor[contractor_name]["workers"] += l.workers_count
            by_contractor[contractor_name]["cost"] += cost

        return {
            "report_type": "Labour Report",
            "period": f"{date_from} to {date_to}",
            "total_workers": total_workers,
            "total_wage_cost": total_wage_cost,
            "by_trade": by_trade,
            "by_contractor": by_contractor,
        }

    def generate_material_report(self, project_id: int, date_from: date, date_to: date, db: Session) -> dict:
        materials = db.query(Material).filter(Material.project_id == project_id).all()
        material_data = []
        for material in materials:
            arrivals = db.query(func.coalesce(func.sum(MaterialArrival.quantity), 0)).filter(
                MaterialArrival.material_id == material.id,
                MaterialArrival.arrival_date >= date_from,
                MaterialArrival.arrival_date <= date_to,
            ).scalar() or 0

            consumptions = db.query(func.coalesce(func.sum(MaterialConsumption.quantity), 0)).filter(
                MaterialConsumption.material_id == material.id,
                MaterialConsumption.consumption_date >= date_from,
                MaterialConsumption.consumption_date <= date_to,
            ).scalar() or 0

            material_data.append({
                "name": material.name,
                "type": material.material_type.value if hasattr(material.material_type, 'value') else material.material_type,
                "unit": material.unit.value if hasattr(material.unit, 'value') else material.unit,
                "opening_stock": material.current_stock + consumptions - arrivals,
                "arrivals": arrivals,
                "consumptions": consumptions,
                "closing_stock": material.current_stock,
                "reorder_level": material.reorder_level,
                "is_low_stock": material.current_stock <= material.reorder_level,
            })

        return {
            "report_type": "Material Report",
            "period": f"{date_from} to {date_to}",
            "materials": material_data,
        }

    def generate_cost_report(self, project_id: int, date_from: date, date_to: date, db: Session) -> dict:
        costs = db.query(CostRecord).filter(
            CostRecord.project_id == project_id,
            CostRecord.date >= date_from,
            CostRecord.date <= date_to,
        ).all()

        project = db.query(Project).filter(Project.id == project_id).first()

        category_breakdown = {}
        for c in costs:
            cat = c.category.value if hasattr(c.category, 'value') else c.category
            if cat not in category_breakdown:
                category_breakdown[cat] = 0
            category_breakdown[cat] += c.amount

        return {
            "report_type": "Cost Report",
            "period": f"{date_from} to {date_to}",
            "project_budget": project.budget if project else 0,
            "total_cost": sum(c.amount for c in costs),
            "category_breakdown": category_breakdown,
            "transactions": [
                {
                    "date": str(c.date),
                    "category": c.category.value if hasattr(c.category, 'value') else c.category,
                    "description": c.description,
                    "amount": c.amount,
                }
                for c in costs
            ],
        }
