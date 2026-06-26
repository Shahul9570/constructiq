from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.equipment import Equipment, EquipmentUsage
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse, EquipmentList,
    EquipmentUsageCreate, EquipmentUsageResponse,
)

router = APIRouter()


@router.get("/", response_model=EquipmentList)
def list_equipment(
    project_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = current_user.company_owner_id if current_user.company_owner_id else current_user.id
    query = db.query(Equipment).filter(Equipment.company_id == company_id)
    
    if project_id:
        query = query.filter(Equipment.project_id == project_id)
    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)
    if status:
        query = query.filter(Equipment.status == status)
    if search:
        query = query.filter(Equipment.name.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(Equipment.name).offset((page - 1) * size).limit(size).all()
    
    for item in items:
        if item.project:
            item.project_name = item.project.name
            
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/", response_model=EquipmentResponse, status_code=201)
def create_equipment(
    data: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = current_user.company_owner_id if current_user.company_owner_id else current_user.id
    equipment = Equipment(**data.model_dump(), company_id=company_id)
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    
    if equipment.project:
        equipment.project_name = equipment.project.name
        
    return equipment


@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    if equipment.project:
        equipment.project_name = equipment.project.name
        
    return equipment


@router.patch("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: int,
    data: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(equipment, key, value)
    db.commit()
    db.refresh(equipment)
    
    if equipment.project:
        equipment.project_name = equipment.project.name
        
    return equipment


@router.delete("/{equipment_id}", status_code=204)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    db.delete(equipment)
    db.commit()


@router.post("/{equipment_id}/usage", response_model=EquipmentUsageResponse, status_code=201)
def record_usage(
    equipment_id: int,
    data: EquipmentUsageCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    usage = EquipmentUsage(
        **data.model_dump(),
        equipment_id=equipment_id,
        project_id=project_id,
        created_by=current_user.id,
    )
    equipment.total_hours_used += data.hours_used
    equipment.total_fuel_used += data.fuel_used
    equipment.status = "in_use"

    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


@router.get("/{equipment_id}/usage", response_model=list[EquipmentUsageResponse])
def list_usage(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(EquipmentUsage)
        .filter(EquipmentUsage.equipment_id == equipment_id)
        .order_by(EquipmentUsage.date.desc())
        .all()
    )


@router.get("/types/list")
def list_equipment_types():
    from app.models.equipment import EquipmentType
    return [et.value for et in EquipmentType]
