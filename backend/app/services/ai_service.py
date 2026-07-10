from typing import Optional
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.project import Project
from app.models.workforce import DailyLabourSummary
from app.models.financial import CostRecord
from app.models.material import Material, MaterialConsumption, MaterialArrival
from app.models.daily_progress import DailyWorkLog


class AIService:
    def __init__(self):
        self.llm = None
        if settings.OPENAI_API_KEY:
            self._init_llm()

    def _init_llm(self):
        try:
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                temperature=0.3,
            )
        except Exception:
            self.llm = None

    def _get_project_context(self, project_id: int, db: Session) -> str:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return "Project not found"

        total_cost = db.query(func.coalesce(func.sum(CostRecord.amount), 0)).filter(
            CostRecord.project_id == project_id
        ).scalar() or 0

        total_workers = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.date == date.today()
        ).scalar() or 0

        recent_logs = db.query(DailyWorkLog).filter(
            DailyWorkLog.project_id == project_id,
            DailyWorkLog.date >= date.today() - timedelta(days=7),
        ).all()

        return f"""
Project: {project.name}
Client: {project.client_name}
Location: {project.location}
Status: {project.status.value if hasattr(project.status, 'value') else project.status}
Progress: {project.progress_percentage:.1f}%
Budget: ${project.budget:,.2f}
Total Spent: ${total_cost:,.2f}
Total Workers: {total_workers}
Start Date: {project.start_date}
Expected End: {project.expected_end_date}
Recent Activities: {len(recent_logs)} in last 7 days
"""

    def _get_material_context(self, project_id: int, db: Session) -> str:
        materials = db.query(Material).filter(Material.project_id == project_id).all()
        if not materials:
            return "No materials found"

        context = "Material Status:\n"
        for m in materials:
            context += f"- {m.name}: {m.current_stock:.1f} {m.unit.value if hasattr(m.unit, 'value') else m.unit} (reorder at {m.reorder_level})\n"
        return context

    def generate_report(self, project_id: int, db: Session) -> str:
        if not self.llm:
            return "AI features require OpenAI API key configuration."

        context = self._get_project_context(project_id, db)
        material_context = self._get_material_context(project_id, db)

        prompt = f"""You are a professional construction project report generator for ConstructIQ.

{context}
{material_context}

Generate a comprehensive daily site report covering:
1. Executive Summary
2. Project Status Overview
3. Progress Highlights
4. Material Status
5. Key Risks and Issues
6. Recommendations

Format professionally with clear sections."""

        try:
            response = self.llm.invoke(prompt)
            return response.content
        except Exception as e:
            return f"AI report generation failed: {str(e)}. Falling back to standard report format."

    def ask_question(self, question: str, project_id: int, db: Session) -> str:
        if not self.llm:
            return "AI assistant requires OpenAI API key configuration."

        context = self._get_project_context(project_id, db)
        material_context = self._get_material_context(project_id, db)

        # Gather recent cost data
        weekly_cost = db.query(func.coalesce(func.sum(CostRecord.amount), 0)).filter(
            CostRecord.project_id == project_id,
            CostRecord.date >= date.today() - timedelta(days=7),
        ).scalar() or 0

        today_attendance = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.date == date.today(),
        ).scalar() or 0

        today_labour_cost = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count * DailyLabourSummary.daily_rate), 0)).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.date == date.today(),
        ).scalar() or 0

        context += f"""
Today's Labour Cost: ${today_labour_cost:,.2f}
Weekly Cost: ${weekly_cost:,.2f}
Today's Attendance: {today_attendance} workers
"""

        prompt = f"""You are the AI Construction Assistant for ConstructIQ. Answer the following question based on the project data.

Current Project Context:
{context}

Question: {question}

Provide a clear, concise, data-driven answer using the project data above."""

        try:
            response = self.llm.invoke(prompt)
            return response.content
        except Exception as e:
            return f"AI query failed: {str(e)}. Please try again."

    def parse_progress_prompt(self, prompt: str, structures: list) -> list:
        if not self.llm:
            raise ValueError("AI features require OpenAI API key configuration.")

        # Prepare a concise list of structure names and IDs
        structure_list = "\n".join([f"ID: {s.mesh_node_id} | Name: {s.name}" for s in structures])
        
        system_prompt = f"""You are a BIM (Building Information Modeling) assistant. 
Your task is to parse a natural language command from a construction manager and map it to specific 3D mesh components to update their progress percentage.

Here is the list of available 3D components in the database:
{structure_list}

The user's command is: "{prompt}"

Based on the command, identify all matching components and determine the requested progress percentage (0 to 100).
If the user says "all walls", find all components with 'Wall' in the name.
If the user says "finished", that means 100%. "Half done" means 50%.

Return ONLY a valid JSON array of objects. Do not include markdown formatting, backticks, or any other text.
Format:
[
  {{"mesh_node_id": "...", "progress_percentage": 50}},
  {{"mesh_node_id": "...", "progress_percentage": 100}}
]"""

        try:
            response = self.llm.invoke(system_prompt)
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            
            import json
            parsed = json.loads(content.strip())
            return parsed
        except Exception as e:
            raise ValueError(f"Failed to parse prompt: {str(e)}")

    def auto_rename_structures(self, structures: list) -> dict:
        """Use AI to batch-rename raw mesh names to human-readable BIM labels."""
        if not self.llm:
            # Fallback: rule-based cleaning when no OpenAI key
            result = {}
            for s in structures:
                raw = s.mesh_node_id or s.name or ""
                # Strip leading Mesh + digits
                import re
                clean = re.sub(r'^Mesh\d+_?', '', raw)
                # Replace underscores with spaces
                clean = clean.replace('_', ' ')
                # Remove trailing _0, _1 index suffixes
                clean = re.sub(r'\s+\d+$', '', clean).strip()
                # Title-case the result
                clean = clean.title() if clean else raw
                result[s.mesh_node_id] = clean or raw
            return result

        # Send in batches of 80 to avoid token limits
        import json, re
        BATCH = 80
        name_map: dict = {}

        for i in range(0, len(structures), BATCH):
            batch = structures[i:i + BATCH]
            items = "\n".join([f'- "{s.mesh_node_id}"' for s in batch])

            prompt = f"""You are a BIM (Building Information Modeling) naming expert.
The following are raw internal mesh node IDs exported from 3D architectural modelling software (SketchUp, Blender, Revit, etc.).
Your task is to rename each one into a short, professional, human-readable BIM label that a construction manager or architect would understand.

Rules:
- Keep names concise (2-5 words max)
- Use standard construction/architectural terminology
- Group similar parts logically (e.g. "North Exterior Wall", "Master Bedroom Ceiling")
- If the name contains a color like "White", "LightGray", "Wood", use that as a material hint
- If no context can be inferred, use a generic label like "Surface Panel", "Structural Element"

Mesh IDs to rename:
{items}

Return ONLY a valid JSON object mapping each original mesh_node_id to its new name. No markdown, no backticks, no explanation.
Example: {{"Mesh370_M_0132_LightGray_0": "Light Gray Wall Panel", "Mesh371_White_0": "White Ceiling Surface"}}"""

            try:
                response = self.llm.invoke(prompt)
                content = response.content.strip()
                # Strip markdown fences if present
                content = re.sub(r'^```json\s*', '', content)
                content = re.sub(r'^```\s*', '', content)
                content = re.sub(r'\s*```$', '', content).strip()
                batch_map = json.loads(content)
                name_map.update(batch_map)
            except Exception:
                # On failure, fall back to rule-based for this batch
                for s in batch:
                    raw = s.mesh_node_id or ""
                    clean = re.sub(r'^Mesh\d+_?', '', raw).replace('_', ' ')
                    clean = re.sub(r'\s+\d+$', '', clean).strip().title()
                    name_map[s.mesh_node_id] = clean or raw

        return name_map

    def predict_completion(self, project_id: int, db: Session) -> dict:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        total_planned = db.query(func.coalesce(func.sum(DailyWorkLog.planned_quantity), 0)).filter(
            DailyWorkLog.project_id == project_id
        ).scalar() or 1

        total_completed = db.query(func.coalesce(func.sum(DailyWorkLog.completed_quantity), 0)).filter(
            DailyWorkLog.project_id == project_id
        ).scalar() or 0

        progress_rate = total_completed / total_planned if total_planned > 0 else 0

        days_elapsed = (date.today() - project.start_date).days
        if days_elapsed > 0 and progress_rate > 0:
            total_days_estimate = days_elapsed / progress_rate
            remaining_days = total_days_estimate - days_elapsed
            predicted_end = date.today() + timedelta(days=int(remaining_days))
        else:
            remaining_days = (project.expected_end_date - date.today()).days
            predicted_end = project.expected_end_date

        delay_days = (predicted_end - project.expected_end_date).days if predicted_end > project.expected_end_date else 0
        delay_probability = min(100, max(0, (delay_days / max(remaining_days, 1)) * 100)) if delay_days > 0 else 0

        return {
            "predicted_completion_date": str(predicted_end),
            "estimated_days_remaining": max(0, remaining_days),
            "delay_days": max(0, delay_days),
            "delay_probability": round(delay_probability, 1),
            "current_progress": round(progress_rate * 100, 1),
            "on_track": delay_days <= 0,
        }

    def forecast_materials(self, project_id: int, db: Session) -> dict:
        materials = db.query(Material).filter(Material.project_id == project_id).all()
        forecasts = []

        for material in materials:
            # Average daily consumption over last 30 days
            thirty_days_ago = date.today() - timedelta(days=30)
            consumption = db.query(func.coalesce(func.sum(MaterialConsumption.quantity), 0)).filter(
                MaterialConsumption.material_id == material.id,
                MaterialConsumption.consumption_date >= thirty_days_ago,
            ).scalar() or 0

            daily_avg = consumption / 30 if consumption > 0 else 0

            if daily_avg > 0:
                days_until_reorder = (material.current_stock - material.reorder_level) / daily_avg
                reorder_date = date.today() + timedelta(days=int(days_until_reorder))
            else:
                days_until_reorder = 999
                reorder_date = None

            forecasts.append({
                "material_name": material.name,
                "current_stock": material.current_stock,
                "unit": material.unit.value if hasattr(material.unit, 'value') else str(material.unit),
                "daily_avg_consumption": round(daily_avg, 2),
                "days_until_reorder": max(0, int(days_until_reorder)),
                "recommended_reorder_date": str(reorder_date) if reorder_date else "No reorder needed",
                "is_low_stock": material.current_stock <= material.reorder_level,
            })

        return {
            "forecasts": forecasts,
            "materials_at_risk": sum(1 for f in forecasts if f["is_low_stock"]),
        }

    def forecast_cost(self, project_id: int, db: Session) -> dict:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        total_cost = db.query(func.coalesce(func.sum(CostRecord.amount), 0)).filter(
            CostRecord.project_id == project_id
        ).scalar() or 0

        progress = project.progress_percentage / 100 if project.progress_percentage > 0 else 0.01

        if progress > 0:
            estimated_final_cost = total_cost / progress
            cost_overrun = estimated_final_cost - project.budget
            cost_confidence = min(95, max(50, 100 - (cost_overrun / project.budget * 100))) if project.budget > 0 else 50
        else:
            estimated_final_cost = project.budget
            cost_overrun = 0
            cost_confidence = 50

        return {
            "total_budget": project.budget,
            "current_spent": total_cost,
            "current_progress": project.progress_percentage,
            "estimated_final_cost": round(estimated_final_cost, 2),
            "estimated_overrun": round(max(0, cost_overrun), 2),
            "estimated_under_budget": round(max(0, -cost_overrun), 2),
            "confidence_level": round(cost_confidence, 1),
            "is_over_budget": cost_overrun > 0,
        }

    def detect_risks(self, project_id: int, db: Session) -> dict:
        risks = []

        # Labour shortage check (Simplified with DailyLabourSummary)
        today_workers = db.query(func.coalesce(func.sum(DailyLabourSummary.workers_count), 0)).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.date == date.today(),
        ).scalar() or 0
        
        if today_workers == 0:
            risks.append({
                "type": "labour_shortage",
                "severity": "high",
                "message": "Zero workers recorded on site today",
            })

        # Material shortage check
        low_stock_materials = db.query(Material).filter(
            Material.project_id == project_id,
            Material.current_stock <= Material.reorder_level,
        ).count()

        if low_stock_materials > 0:
            risks.append({
                "type": "material_shortage",
                "severity": "high",
                "message": f"{low_stock_materials} material(s) are below reorder level",
            })

        # Schedule risk
        project = db.query(Project).filter(Project.id == project_id).first()
        if project and project.expected_end_date:
            remaining_days = (project.expected_end_date - date.today()).days
            if remaining_days < 30 and project.progress_percentage < 80:
                risks.append({
                    "type": "schedule_delay",
                    "severity": "critical",
                    "message": f"Project at {project.progress_percentage:.1f}% with only {remaining_days} days remaining",
                })
            elif remaining_days < 0:
                risks.append({
                    "type": "overdue",
                    "severity": "critical",
                    "message": f"Project is {-remaining_days} days past expected end date",
                })

        # Budget risk
        total_cost = db.query(func.coalesce(func.sum(CostRecord.amount), 0)).filter(
            CostRecord.project_id == project_id
        ).scalar() or 0

        if project and project.budget > 0 and (total_cost / project.budget) > 0.9:
            severity = "critical" if (total_cost / project.budget) > 1 else "high"
            risks.append({
                "type": "budget_overrun",
                "severity": severity,
                "message": f"Budget utilization at {(total_cost / project.budget * 100):.1f}% (${total_cost:,.2f} of ${project.budget:,.2f})",
            })

        return {
            "risks": risks,
            "risk_count": len(risks),
            "has_critical_risks": any(r["severity"] == "critical" for r in risks),
            "overall_health": "critical" if any(r["severity"] == "critical" for r in risks) else
                             "warning" if any(r["severity"] == "high" for r in risks) else "good",
        }
