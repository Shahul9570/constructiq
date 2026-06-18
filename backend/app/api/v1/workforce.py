from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workforce import DailyLabourSummary, TradeType
from app.models.contractor import Contractor
from app.schemas.workforce import (
    DailyLabourSummaryCreate, DailyLabourSummaryUpdate, 
    DailyLabourSummaryResponse, DailyLabourSummaryList
)

router = APIRouter()


@router.get("/", response_model=DailyLabourSummaryList)
def list_labour_summaries(
    project_id: int,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    trade: Optional[str] = None,
    contractor_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DailyLabourSummary).filter(DailyLabourSummary.project_id == project_id)
    if date_from:
        query = query.filter(DailyLabourSummary.date >= date_from)
    if date_to:
        query = query.filter(DailyLabourSummary.date <= date_to)
    if trade:
        query = query.filter(DailyLabourSummary.trade == trade)
    if contractor_id:
        query = query.filter(DailyLabourSummary.contractor_id == contractor_id)

    total = query.count()
    records = query.order_by(DailyLabourSummary.date.desc()).offset((page - 1) * size).limit(size).all()
    
    return {"items": records, "total": total, "page": page, "size": size}


@router.post("/", response_model=DailyLabourSummaryResponse, status_code=201)
def create_labour_summary(
    data: DailyLabourSummaryCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = DailyLabourSummary(
        **data.model_dump(),
        project_id=project_id,
        created_by=current_user.id
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.patch("/{summary_id}", response_model=DailyLabourSummaryResponse)
def update_labour_summary(
    summary_id: int,
    data: DailyLabourSummaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = db.query(DailyLabourSummary).filter(DailyLabourSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Labour summary not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(summary, key, value)
        
    db.commit()
    db.refresh(summary)
    return summary


@router.delete("/{summary_id}", status_code=204)
def delete_labour_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = db.query(DailyLabourSummary).filter(DailyLabourSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Labour summary not found")
    db.delete(summary)
    db.commit()


@router.get("/summary")
def labour_metrics_summary(
    project_id: int,
    date_from: str,
    date_to: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(DailyLabourSummary).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.date >= date_from,
        DailyLabourSummary.date <= date_to,
    ).all()

    total_workers = 0
    total_cost = 0.0
    by_trade = {}
    by_contractor = {}

    for r in records:
        cost = r.workers_count * r.daily_rate
        total_workers += r.workers_count
        total_cost += cost

        if r.trade not in by_trade:
            by_trade[r.trade] = {"count": 0, "cost": 0.0}
        by_trade[r.trade]["count"] += r.workers_count
        by_trade[r.trade]["cost"] += cost

        # Resolve contractor name
        contractor_name = "Direct / Self"
        if r.contractor_id:
            contractor = db.query(Contractor).filter(Contractor.id == r.contractor_id).first()
            if contractor:
                contractor_name = contractor.name

        if contractor_name not in by_contractor:
            by_contractor[contractor_name] = {"count": 0, "cost": 0.0}
        by_contractor[contractor_name]["count"] += r.workers_count
        by_contractor[contractor_name]["cost"] += cost

    return {
        "total_workers": total_workers,
        "total_cost": total_cost,
        "by_trade": by_trade,
        "by_contractor": by_contractor,
    }


@router.get("/trades")
def list_trades():
    return [trade.value for trade in TradeType]
