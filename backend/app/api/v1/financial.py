from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.core.database import get_db
from app.core.audit import log_action
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.financial import CostRecord, Invoice, CostCategory
from app.schemas.financial import (
    CostRecordCreate, CostRecordResponse,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    SubmitPaymentRequest,
    CostSummary, BudgetTracking,
)
from app.models.project import Project

router = APIRouter()


@router.post("/costs", response_model=CostRecordResponse, status_code=201)
def add_cost(
    data: CostRecordCreate,
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER)),
):
    status = "pending" if current_user.role == UserRole.SITE_ENGINEER else "approved"
    cost = CostRecord(**data.model_dump(), project_id=project_id, created_by=current_user.id, status=status)
    db.add(cost)
    db.commit()
    db.refresh(cost)
    
    log_action(db, current_user.id, "COST_RECORDED", "CostRecord", cost.id, {"amount": cost.amount, "category": cost.category.value if hasattr(cost.category, 'value') else str(cost.category)}, request.client.host if request.client else None)
    
    return cost

@router.post("/costs/{cost_id}/status", response_model=CostRecordResponse)
def update_cost_status(
    cost_id: int,
    request: Request,
    status: str = Query(..., description="approved or rejected"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER)),
):
    cost = db.query(CostRecord).filter(CostRecord.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Cost record not found")
    
    if status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    # If approving a contractor expense with a reference, sync the ledger
    if status == 'approved' and cost.status != 'approved' and cost.category == 'contractor' and cost.reference_id:
        from app.models.contractor import Contractor, ContractorPayment, PaymentStatus
        contractor = db.query(Contractor).filter(Contractor.id == cost.reference_id).first()
        if contractor:
            # For general contractor costs, we assume it's a payment made to them, so we add to paid_amount
            contractor.paid_amount += cost.amount
            contractor.pending_amount = contractor.contract_amount - contractor.paid_amount
            payment = ContractorPayment(
                contractor_id=contractor.id,
                amount=cost.amount,
                payment_date=cost.date,
                payment_method="cash",
                status=PaymentStatus.PAID,
                notes=cost.description or "Manual Contractor Expense",
                created_by=current_user.id
            )
            db.add(payment)

    cost.status = status
    db.commit()
    db.refresh(cost)
    
    log_action(db, current_user.id, "COST_STATUS_UPDATED", "CostRecord", cost.id, {"status": status}, request.client.host if request.client else None)
    
    return cost

@router.get("/costs", response_model=list[CostRecordResponse])
def list_costs(
    project_id: int,
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER)),
):
    from app.models.workforce import DailyLabourSummary
    from app.models.material import MaterialArrival, Material
    from app.models.equipment import Equipment, EquipmentUsage
    from datetime import datetime

    results = []

    # 1. Manual Cost Records
    query = db.query(CostRecord).filter(CostRecord.project_id == project_id)
    if category:
        query = query.filter(CostRecord.category == category)
    if date_from:
        query = query.filter(CostRecord.date >= date_from)
    if date_to:
        query = query.filter(CostRecord.date <= date_to)
    
    for c in query.all():
        results.append(CostRecordResponse(
            id=c.id, project_id=c.project_id, category=c.category.value if hasattr(c.category, 'value') else str(c.category),
            description=c.description, amount=c.amount, date=c.date,
            reference_type=c.reference_type, reference_id=c.reference_id,
            created_by=c.created_by, status=c.status, created_at=c.created_at
        ))

    # 2. Labour
    if not category or category == "labour":
        labour_q = db.query(DailyLabourSummary).filter(
            DailyLabourSummary.project_id == project_id,
            DailyLabourSummary.verification_status == 'approved'
        )
        if date_from: labour_q = labour_q.filter(DailyLabourSummary.date >= date_from)
        if date_to: labour_q = labour_q.filter(DailyLabourSummary.date <= date_to)
        for l in labour_q.all():
            amount = (l.workers_count or 0) * (l.daily_rate or 0)
            if amount > 0:
                results.append(CostRecordResponse(
                    id=l.id * 100000 + 1, project_id=project_id, category="labour",
                    description=f"Labour Cost: {l.workers_count} workers", amount=amount, date=l.date,
                    created_by=l.created_by, status="approved", created_at=l.created_at or datetime.now()
                ))

    # 3. Materials
    if not category or category == "material":
        mat_q = db.query(MaterialArrival, Material).join(Material).filter(Material.project_id == project_id)
        if date_from: mat_q = mat_q.filter(MaterialArrival.arrival_date >= date_from)
        if date_to: mat_q = mat_q.filter(MaterialArrival.arrival_date <= date_to)
        for arrival, mat in mat_q.all():
            amount = arrival.invoice_amount if arrival.invoice_amount else (arrival.quantity * mat.unit_price)
            if amount > 0:
                results.append(CostRecordResponse(
                    id=arrival.id * 100000 + 2, project_id=project_id, category="material",
                    description=f"Material: {mat.name} ({arrival.quantity} units)", amount=amount, date=arrival.arrival_date,
                    created_by=arrival.received_by, status="approved", created_at=datetime.now()
                ))

    # 4. Equipment
    if not category or category == "equipment":
        # Equipment Purchases
        eq_q = db.query(Equipment).filter(Equipment.project_id == project_id, Equipment.purchase_cost > 0)
        if date_from: eq_q = eq_q.filter(Equipment.purchase_date >= date_from)
        if date_to: eq_q = eq_q.filter(Equipment.purchase_date <= date_to)
        for eq in eq_q.all():
            if eq.purchase_date:
                results.append(CostRecordResponse(
                    id=eq.id * 100000 + 3, project_id=project_id, category="equipment",
                    description=f"Equipment Purchase: {eq.name}", amount=eq.purchase_cost, date=eq.purchase_date,
                    created_by=1, status="approved", created_at=eq.created_at or datetime.now()
                ))
        
        # Equipment Usage
        use_q = db.query(EquipmentUsage, Equipment).join(Equipment).filter(EquipmentUsage.project_id == project_id)
        if date_from: use_q = use_q.filter(EquipmentUsage.date >= date_from)
        if date_to: use_q = use_q.filter(EquipmentUsage.date <= date_to)
        for use, eq in use_q.all():
            amount = use.hours_used * eq.hourly_rate
            if amount > 0:
                results.append(CostRecordResponse(
                    id=use.id * 100000 + 4, project_id=project_id, category="equipment",
                    description=f"Equipment Usage: {eq.name} ({use.hours_used}h)", amount=amount, date=use.date,
                    created_by=use.created_by, status="approved", created_at=use.created_at or datetime.now()
                ))

    # Sort descending by date
    results.sort(key=lambda x: x.date, reverse=True)
    return results


@router.get("/summary")
def cost_summary(
    project_id: int,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER)),
):
    from app.models.workforce import DailyLabourSummary
    from app.models.material import MaterialArrival, Material

    # Labour cost from DailyLabourSummary (workers_count * daily_rate)
    labour_q = db.query(DailyLabourSummary).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.verification_status == 'approved'
    )
    if date_from:
        labour_q = labour_q.filter(DailyLabourSummary.date >= date_from)
    if date_to:
        labour_q = labour_q.filter(DailyLabourSummary.date <= date_to)
    total_labour_cost = sum(
        (r.workers_count or 0) * (r.daily_rate or 0) for r in labour_q.all()
    )

    # Material cost from MaterialArrival invoice amounts (or quantity * unit_price)
    material_cost_expr = func.coalesce(
        func.nullif(MaterialArrival.invoice_amount, 0),
        MaterialArrival.quantity * Material.unit_price
    )
    material_q = (
        db.query(func.coalesce(func.sum(material_cost_expr), 0))
        .join(Material, Material.id == MaterialArrival.material_id)
        .filter(Material.project_id == project_id)
    )
    if date_from:
        material_q = material_q.filter(MaterialArrival.arrival_date >= date_from)
    if date_to:
        material_q = material_q.filter(MaterialArrival.arrival_date <= date_to)
    total_material_cost = float(material_q.scalar() or 0)

    from app.models.equipment import Equipment, EquipmentUsage

    # Equipment cost: (Sum of purchase costs) + (Sum of usage hours * hourly rate)
    eq_purchase_q = db.query(func.coalesce(func.sum(Equipment.purchase_cost), 0)).filter(
        Equipment.project_id == project_id
    )
    if date_from:
        eq_purchase_q = eq_purchase_q.filter(Equipment.purchase_date >= date_from)
    if date_to:
        eq_purchase_q = eq_purchase_q.filter(Equipment.purchase_date <= date_to)
    
    eq_usage_q = (
        db.query(func.coalesce(func.sum(EquipmentUsage.hours_used * Equipment.hourly_rate), 0))
        .join(Equipment, Equipment.id == EquipmentUsage.equipment_id)
        .filter(EquipmentUsage.project_id == project_id)
    )
    if date_from:
        eq_usage_q = eq_usage_q.filter(EquipmentUsage.date >= date_from)
    if date_to:
        eq_usage_q = eq_usage_q.filter(EquipmentUsage.date <= date_to)

    total_equipment_cost = float(eq_purchase_q.scalar() or 0) + float(eq_usage_q.scalar() or 0)

    # Manual cost records (contractor, overhead, other, and any manual equipment overrides)
    cost_q = db.query(CostRecord).filter(CostRecord.project_id == project_id)
    if date_from:
        cost_q = cost_q.filter(CostRecord.date >= date_from)
    if date_to:
        cost_q = cost_q.filter(CostRecord.date <= date_to)

    total_contractor_cost = 0.0
    total_overhead_cost = 0.0
    total_other_cost = 0.0

    for c in cost_q.all():
        cat = c.category.value if hasattr(c.category, 'value') else str(c.category)
        if cat == "equipment":
            total_equipment_cost += c.amount
        elif cat == "contractor":
            total_contractor_cost += c.amount
        elif cat == "overhead":
            total_overhead_cost += c.amount
        else:
            total_other_cost += c.amount

    total_cost = (
        total_labour_cost + total_material_cost
        + total_equipment_cost + total_contractor_cost
        + total_overhead_cost + total_other_cost
    )

    return {
        "total_labour_cost":     total_labour_cost,
        "total_material_cost":   total_material_cost,
        "total_equipment_cost":  total_equipment_cost,
        "total_contractor_cost": total_contractor_cost,
        "total_overhead_cost":   total_overhead_cost,
        "total_other_cost":      total_other_cost,
        "total_cost":            total_cost,
    }


@router.get("/budget-tracking", response_model=BudgetTracking)
def budget_tracking(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER)),
):
    from app.models.workforce import DailyLabourSummary
    from app.models.material import MaterialArrival, Material

    from app.models.equipment import Equipment, EquipmentUsage

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Labour cost
    labour_rows = db.query(DailyLabourSummary).filter(
        DailyLabourSummary.project_id == project_id,
        DailyLabourSummary.verification_status == 'approved'
    ).all()
    labour_total = sum((r.workers_count or 0) * (r.daily_rate or 0) for r in labour_rows)

    # Material cost (use invoice_amount if > 0, otherwise estimate: quantity * unit_price)
    material_cost_expr = func.coalesce(
        func.nullif(MaterialArrival.invoice_amount, 0),
        MaterialArrival.quantity * Material.unit_price
    )
    material_total = float(
        db.query(func.coalesce(func.sum(material_cost_expr), 0))
        .join(Material, Material.id == MaterialArrival.material_id)
        .filter(Material.project_id == project_id)
        .scalar() or 0
    )

    # Equipment Cost
    eq_purchase_total = float(
        db.query(func.coalesce(func.sum(Equipment.purchase_cost), 0))
        .filter(Equipment.project_id == project_id)
        .scalar() or 0
    )
    eq_usage_total = float(
        db.query(func.coalesce(func.sum(EquipmentUsage.hours_used * Equipment.hourly_rate), 0))
        .join(Equipment, Equipment.id == EquipmentUsage.equipment_id)
        .filter(EquipmentUsage.project_id == project_id)
        .scalar() or 0
    )
    equipment_total = eq_purchase_total + eq_usage_total

    # Manual cost records
    cost_rows = db.query(CostRecord).filter(CostRecord.project_id == project_id).all()
    cost_total = sum(c.amount for c in cost_rows)

    total_spent = labour_total + material_total + equipment_total + cost_total
    remaining = project.budget - total_spent

    # Category breakdown for charts
    category_breakdown = [
        {"category": "labour",    "amount": labour_total},
        {"category": "material",  "amount": material_total},
        {"category": "equipment", "amount": equipment_total},
        {"category": "other",     "amount": cost_total},
    ]

    return BudgetTracking(
        project_id=project_id,
        total_budget=project.budget,
        total_spent=total_spent,
        remaining=max(0, remaining),
        utilization_percentage=(total_spent / project.budget * 100) if project.budget > 0 else 0,
        is_over_budget=total_spent > project.budget,
        category_breakdown=category_breakdown,
    )



@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    data: InvoiceCreate,
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER)),
):
    invoice = Invoice(
        **data.model_dump(),
        total_amount=data.amount + data.tax_amount,
        created_by=current_user.id,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    log_action(db, current_user.id, "INVOICE_CREATED", "Invoice", invoice.id, {"amount": invoice.total_amount, "type": invoice.invoice_type.value if hasattr(invoice.invoice_type, 'value') else str(invoice.invoice_type)}, request.client.host if request.client else None)
    
    return invoice


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    project_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER)),
):
    from app.models.material import MaterialArrival, Material
    from datetime import datetime

    results = []

    # 1. Manual Invoices
    query = db.query(Invoice).filter(Invoice.project_id == project_id)
    if status:
        query = query.filter(Invoice.status == status)
    
    for inv in query.all():
        results.append(InvoiceResponse(
            id=inv.id, project_id=inv.project_id, invoice_number=inv.invoice_number,
            invoice_type=inv.invoice_type.value if hasattr(inv.invoice_type, 'value') else str(inv.invoice_type),
            vendor_name=inv.vendor_name, total_amount=inv.total_amount, amount=inv.amount,
            tax_amount=inv.tax_amount, issue_date=inv.issue_date, due_date=inv.due_date,
            status=inv.status.value if hasattr(inv.status, 'value') else str(inv.status),
            paid_date=inv.paid_date, payment_method=inv.payment_method, notes=inv.notes,
            file_url=inv.file_url, created_by=inv.created_by, created_at=inv.created_at,
            updated_at=inv.updated_at or datetime.now()
        ))

    # 2. Material Arrivals with Invoices
    if not status or status == "paid":
        mat_q = db.query(MaterialArrival, Material).join(Material).filter(Material.project_id == project_id)
        for arrival, mat in mat_q.all():
            amount = arrival.invoice_amount if arrival.invoice_amount else (arrival.quantity * mat.unit_price)
            if amount > 0:
                results.append(InvoiceResponse(
                    id=arrival.id * 100000 + 1, project_id=project_id, 
                    invoice_number=f"MAT-{arrival.id}", invoice_type="material",
                    vendor_name="Material Supplier", amount=amount, total_amount=amount, tax_amount=0.0,
                    issue_date=arrival.arrival_date, due_date=arrival.arrival_date,
                    status="paid", paid_date=arrival.arrival_date, payment_method=None,
                    notes=f"Material: {mat.name}", file_url=None, created_by=arrival.received_by,
                    created_at=arrival.created_at or datetime.now(), updated_at=arrival.created_at or datetime.now()
                ))

    results.sort(key=lambda x: x.issue_date, reverse=True)
    return results


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT, UserRole.PROJECT_MANAGER)),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/invoices/{invoice_id}/submit-payment", response_model=InvoiceResponse)
def submit_payment(
    invoice_id: int,
    data: SubmitPaymentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CLIENT, UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER)),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.status = "PENDING_VERIFICATION"
    invoice.payment_method = data.payment_method
    if data.notes:
        existing_notes = invoice.notes or ""
        invoice.notes = f"{existing_notes}\n[Client Payment Submitted]: {data.notes}".strip()
        
    db.commit()
    db.refresh(invoice)
    
    log_action(db, current_user.id, "PAYMENT_SUBMITTED", "Invoice", invoice.id, {"payment_method": data.payment_method}, request.client.host if request.client else None)
    
    return invoice



@router.get("/categories")
def list_cost_categories():
    return [cc.value for cc in CostCategory]
