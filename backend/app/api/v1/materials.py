from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.material import Material, MaterialArrival, MaterialConsumption, MaterialPayment
from app.schemas.material import (
    MaterialCreate, MaterialUpdate, MaterialResponse, MaterialList,
    MaterialArrivalCreate, MaterialArrivalUpdate, MaterialArrivalResponse,
    MaterialConsumptionCreate, MaterialConsumptionResponse,
    MaterialPaymentCreate, MaterialPaymentResponse,
)

router = APIRouter()


@router.get("/", response_model=MaterialList)
def list_materials(
    project_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    material_type: Optional[str] = None,
    low_stock: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Material).filter(Material.project_id == project_id)
    if material_type:
        query = query.filter(Material.material_type == material_type)
    if low_stock:
        query = query.filter(Material.current_stock <= Material.reorder_level)
    if search:
        query = query.filter(Material.name.ilike(f"%{search}%"))
    total = query.count()
    materials = query.order_by(Material.name).offset((page - 1) * size).limit(size).all()

    items = []
    for m in materials:
        resp = MaterialResponse.model_validate(m)
        resp.is_low_stock = m.current_stock <= m.reorder_level
        items.append(resp)

    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/", response_model=MaterialResponse, status_code=201)
def create_material(
    data: MaterialCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = Material(**data.model_dump(), project_id=project_id)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    resp = MaterialResponse.model_validate(material)
    resp.is_low_stock = material.current_stock <= material.reorder_level
    return resp


@router.patch("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(material, key, value)
    db.commit()
    db.refresh(material)
    return material


@router.post("/{material_id}/arrivals", response_model=MaterialArrivalResponse, status_code=201)
def add_arrival(
    material_id: int,
    data: MaterialArrivalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    arrival = MaterialArrival(
        **data.model_dump(),
        material_id=material_id,
        received_by=current_user.id,
    )
    material.current_stock += data.quantity
    db.add(arrival)
    db.commit()
    db.refresh(arrival)
    return arrival


@router.post("/{material_id}/consumptions", response_model=MaterialConsumptionResponse, status_code=201)
def add_consumption(
    material_id: int,
    data: MaterialConsumptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    if material.current_stock < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    consumption = MaterialConsumption(
        **data.model_dump(),
        material_id=material_id,
        used_by=current_user.id,
    )
    material.current_stock -= data.quantity
    db.add(consumption)
    db.commit()
    db.refresh(consumption)
    return consumption


@router.post("/arrivals/{arrival_id}/payments", response_model=MaterialPaymentResponse, status_code=201)
def add_arrival_payment(
    arrival_id: int,
    data: MaterialPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arrival = db.query(MaterialArrival).filter(MaterialArrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail="Arrival not found")

    payment = MaterialPayment(
        **data.model_dump(),
        arrival_id=arrival_id,
        created_by=current_user.id,
    )
    arrival.paid_amount += data.amount
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{material_id}/arrivals", response_model=list[MaterialArrivalResponse])
def list_arrivals(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(MaterialArrival)
        .filter(MaterialArrival.material_id == material_id)
        .order_by(MaterialArrival.arrival_date.desc())
        .all()
    )

@router.patch("/arrivals/{arrival_id}", response_model=MaterialArrivalResponse)
def update_arrival(
    arrival_id: int,
    data: MaterialArrivalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arrival = db.query(MaterialArrival).filter(MaterialArrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail="Arrival not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(arrival, key, value)
        
    db.commit()
    db.refresh(arrival)
    return arrival


@router.get("/{material_id}/consumptions", response_model=list[MaterialConsumptionResponse])
def list_consumptions(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(MaterialConsumption)
        .filter(MaterialConsumption.material_id == material_id)
        .order_by(MaterialConsumption.consumption_date.desc())
        .all()
    )


@router.get("/types/list")
def list_material_types():
    from app.models.material import MaterialType
    return [mt.value for mt in MaterialType]
