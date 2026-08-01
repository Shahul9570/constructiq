from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Any
from datetime import date, datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.models.project import Project
from app.models.site_diary import SiteDiary
from pydantic import BaseModel, Field

router = APIRouter()

class SiteDiaryCreate(BaseModel):
    project_id: int
    date: date
    weather_condition: str = "sunny"  # sunny, cloudy, rain, heavy_rain, high_wind, extreme_heat
    temperature_c: float = 28.0
    rainfall_mm: float = 0.0
    work_impact: str = "none"  # none, minor_delay, partial_stoppage, full_stoppage
    crane_stoppage_hours: float = 0.0
    lost_man_hours: float = 0.0
    impacted_activities: Optional[str] = None
    delay_description: Optional[str] = None
    shift_type: str = "day"

class SiteDiaryUpdate(BaseModel):
    weather_condition: Optional[str] = None
    temperature_c: Optional[float] = None
    rainfall_mm: Optional[float] = None
    work_impact: Optional[str] = None
    crane_stoppage_hours: Optional[float] = None
    lost_man_hours: Optional[float] = None
    impacted_activities: Optional[str] = None
    delay_description: Optional[str] = None
    shift_type: Optional[str] = None

class SiteDiaryResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    date: date
    weather_condition: str
    temperature_c: float
    rainfall_mm: float
    work_impact: str
    crane_stoppage_hours: float
    lost_man_hours: float
    impacted_activities: Optional[str] = None
    delay_description: Optional[str] = None
    shift_type: str
    logged_by_id: Optional[int] = None
    logged_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SiteDiarySummaryResponse(BaseModel):
    total_entries: int
    total_stoppage_days: int
    total_lost_man_hours: float
    total_crane_stoppage_hours: float
    total_rainfall_mm: float
    impact_breakdown: dict

@router.get("", response_model=List[SiteDiaryResponse])
def list_site_diaries(
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    work_impact: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SiteDiary)

    if project_id:
        query = query.filter(SiteDiary.project_id == project_id)

    if start_date:
        query = query.filter(SiteDiary.date >= start_date)

    if end_date:
        query = query.filter(SiteDiary.date <= end_date)

    if work_impact and work_impact != "all":
        query = query.filter(SiteDiary.work_impact == work_impact)

    entries = query.order_by(SiteDiary.date.desc()).all()

    result = []
    for entry in entries:
        project = db.query(Project).filter(Project.id == entry.project_id).first()
        user = db.query(User).filter(User.id == entry.logged_by_id).first() if entry.logged_by_id else None
        
        result.append(
            SiteDiaryResponse(
                id=entry.id,
                project_id=entry.project_id,
                project_name=project.name if project else "N/A",
                date=entry.date,
                weather_condition=entry.weather_condition,
                temperature_c=entry.temperature_c,
                rainfall_mm=entry.rainfall_mm,
                work_impact=entry.work_impact,
                crane_stoppage_hours=entry.crane_stoppage_hours,
                lost_man_hours=entry.lost_man_hours,
                impacted_activities=entry.impacted_activities,
                delay_description=entry.delay_description,
                shift_type=entry.shift_type,
                logged_by_id=entry.logged_by_id,
                logged_by_name=user.full_name if user else "System",
                created_at=entry.created_at
            )
        )

    return result

@router.get("/summary", response_model=SiteDiarySummaryResponse)
def get_site_diary_summary(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SiteDiary)
    if project_id:
        query = query.filter(SiteDiary.project_id == project_id)

    entries = query.all()

    total_entries = len(entries)
    stoppage_days = sum(1 for e in entries if e.work_impact in ["partial_stoppage", "full_stoppage"])
    lost_man_hours = sum(e.lost_man_hours for e in entries)
    crane_stoppage = sum(e.crane_stoppage_hours for e in entries)
    rainfall = sum(e.rainfall_mm for e in entries)

    impact_counts = {"none": 0, "minor_delay": 0, "partial_stoppage": 0, "full_stoppage": 0}
    for e in entries:
        if e.work_impact in impact_counts:
            impact_counts[e.work_impact] += 1

    return SiteDiarySummaryResponse(
        total_entries=total_entries,
        total_stoppage_days=stoppage_days,
        total_lost_man_hours=lost_man_hours,
        total_crane_stoppage_hours=crane_stoppage,
        total_rainfall_mm=rainfall,
        impact_breakdown=impact_counts
    )

from app.api.v1.subscription import check_feature_access

@router.post("", response_model=SiteDiaryResponse, status_code=status.HTTP_201_CREATED)
def create_site_diary(
    data: SiteDiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce SaaS subscription feature tier access
    check_feature_access(db, current_user, "site_diary")

    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    entry = SiteDiary(
        project_id=data.project_id,
        date=data.date,
        weather_condition=data.weather_condition,
        temperature_c=data.temperature_c,
        rainfall_mm=data.rainfall_mm,
        work_impact=data.work_impact,
        crane_stoppage_hours=data.crane_stoppage_hours,
        lost_man_hours=data.lost_man_hours,
        impacted_activities=data.impacted_activities,
        delay_description=data.delay_description,
        shift_type=data.shift_type,
        logged_by_id=current_user.id
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_action(
        db,
        current_user.id,
        "SITE_DIARY_CREATED",
        "SiteDiary",
        entry.id,
        {"project_id": data.project_id, "weather": data.weather_condition, "impact": data.work_impact}
    )

    return SiteDiaryResponse(
        id=entry.id,
        project_id=entry.project_id,
        project_name=project.name,
        date=entry.date,
        weather_condition=entry.weather_condition,
        temperature_c=entry.temperature_c,
        rainfall_mm=entry.rainfall_mm,
        work_impact=entry.work_impact,
        crane_stoppage_hours=entry.crane_stoppage_hours,
        lost_man_hours=entry.lost_man_hours,
        impacted_activities=entry.impacted_activities,
        delay_description=entry.delay_description,
        shift_type=entry.shift_type,
        logged_by_id=current_user.id,
        logged_by_name=current_user.full_name,
        created_at=entry.created_at
    )
