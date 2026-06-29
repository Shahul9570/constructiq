from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.contractor import Contractor, ContractorPayment, PaymentStatus
from app.schemas.contractor import (
    ContractorCreate, ContractorUpdate, ContractorResponse, ContractorList,
    ContractorPaymentCreate, ContractorPaymentResponse,
)

router = APIRouter()


@router.get("/", response_model=ContractorList)
def list_contractors(
    project_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Contractor).filter(Contractor.project_id == project_id)
    if search:
        query = query.filter(
            (Contractor.name.ilike(f"%{search}%")) |
            (Contractor.company_name.ilike(f"%{search}%"))
        )
    total = query.count()
    contractors = query.order_by(Contractor.name).offset((page - 1) * size).limit(size).all()
    return {"items": contractors, "total": total, "page": page, "size": size}


@router.post("/", response_model=ContractorResponse, status_code=201)
def create_contractor(
    data: ContractorCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contractor = Contractor(
        **data.model_dump(),
        project_id=project_id,
        pending_amount=data.contract_amount,
    )
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return contractor


@router.get("/{contractor_id}", response_model=ContractorResponse)
def get_contractor(
    contractor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return contractor


@router.patch("/{contractor_id}", response_model=ContractorResponse)
def update_contractor(
    contractor_id: int,
    data: ContractorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contractor, key, value)
    db.commit()
    db.refresh(contractor)
    return contractor


@router.delete("/{contractor_id}", status_code=204)
def delete_contractor(
    contractor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    db.delete(contractor)
    db.commit()


@router.post("/{contractor_id}/payments", response_model=ContractorPaymentResponse, status_code=201)
def create_payment(
    contractor_id: int,
    data: ContractorPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    payment = ContractorPayment(
        **data.model_dump(),
        contractor_id=contractor_id,
        created_by=current_user.id,
        status=PaymentStatus.PAID,
    )
    contractor.paid_amount += data.amount
    contractor.pending_amount = contractor.contract_amount - contractor.paid_amount
    db.add(payment)
    
    # Also log this payment in the general financial ledger
    from app.models.financial import CostRecord, CostCategory
    cost_record = CostRecord(
        project_id=contractor.project_id,
        category=CostCategory.CONTRACTOR,
        amount=data.amount,
        date=data.payment_date,
        description=f"Payment to contractor: {contractor.name} ({data.notes or 'No notes'})",
        status="approved",
        created_by=current_user.id,
    )
    db.add(cost_record)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{contractor_id}/payments", response_model=list[ContractorPaymentResponse])
def list_payments(
    contractor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payments = (
        db.query(ContractorPayment)
        .filter(ContractorPayment.contractor_id == contractor_id)
        .order_by(ContractorPayment.payment_date.desc())
        .all()
    )
    return payments
