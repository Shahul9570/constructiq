from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.financial import Invoice, InvoiceType, InvoiceStatus
from app.models.project import Project
from app.schemas.financial import InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.api.v1.dashboards import _get_project_total_cost

router = APIRouter(prefix="/billing", tags=["billing"])

# Only Admin, Owner, and Accountant can access these endpoints
billing_roles = [UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT]

@router.get("/summary")
def get_billing_summary(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*billing_roles)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get total project cost
    total_cost = _get_project_total_cost(db, project_id)

    # Get all client invoices
    client_invoices = db.query(Invoice).filter(
        Invoice.project_id == project_id,
        Invoice.invoice_type == InvoiceType.CLIENT
    ).all()

    total_billed = sum(inv.total_amount for inv in client_invoices)
    total_collected = sum(inv.total_amount for inv in client_invoices if inv.status == InvoiceStatus.PAID)
    pending_receivables = total_billed - total_collected
    
    profit_margin = 0.0
    if total_billed > 0:
        profit_margin = ((total_billed - total_cost) / total_billed) * 100

    return {
        "total_billed": total_billed,
        "total_collected": total_collected,
        "pending_receivables": pending_receivables,
        "total_cost": total_cost,
        "profit_margin_percentage": profit_margin,
        "is_profitable": total_billed >= total_cost
    }

@router.get("/invoices", response_model=List[InvoiceResponse])
def list_client_invoices(
    project_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*billing_roles)),
):
    query = db.query(Invoice).filter(
        Invoice.project_id == project_id,
        Invoice.invoice_type == InvoiceType.CLIENT
    )
    if status:
        query = query.filter(Invoice.status == status)
        
    invoices = query.order_by(Invoice.issue_date.desc()).all()
    
    results = []
    for inv in invoices:
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
    return results

@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
def create_client_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*billing_roles)),
):
    # Enforce invoice type is client
    data.invoice_type = InvoiceType.CLIENT.value
    
    # Check duplicate invoice number
    existing = db.query(Invoice).filter(Invoice.invoice_number == data.invoice_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists")

    invoice = Invoice(
        **data.model_dump(),
        total_amount=data.amount + data.tax_amount,
        created_by=current_user.id
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return InvoiceResponse(
        id=invoice.id, project_id=invoice.project_id, invoice_number=invoice.invoice_number,
        invoice_type=invoice.invoice_type.value if hasattr(invoice.invoice_type, 'value') else str(invoice.invoice_type),
        vendor_name=invoice.vendor_name, total_amount=invoice.total_amount, amount=invoice.amount,
        tax_amount=invoice.tax_amount, issue_date=invoice.issue_date, due_date=invoice.due_date,
        status=invoice.status.value if hasattr(invoice.status, 'value') else str(invoice.status),
        paid_date=invoice.paid_date, payment_method=invoice.payment_method, notes=invoice.notes,
        file_url=invoice.file_url, created_by=invoice.created_by, created_at=invoice.created_at,
        updated_at=invoice.updated_at or datetime.now()
    )

@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_client_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*billing_roles)),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.invoice_type == InvoiceType.CLIENT
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Client invoice not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)
    
    return InvoiceResponse(
        id=invoice.id, project_id=invoice.project_id, invoice_number=invoice.invoice_number,
        invoice_type=invoice.invoice_type.value if hasattr(invoice.invoice_type, 'value') else str(invoice.invoice_type),
        vendor_name=invoice.vendor_name, total_amount=invoice.total_amount, amount=invoice.amount,
        tax_amount=invoice.tax_amount, issue_date=invoice.issue_date, due_date=invoice.due_date,
        status=invoice.status.value if hasattr(invoice.status, 'value') else str(invoice.status),
        paid_date=invoice.paid_date, payment_method=invoice.payment_method, notes=invoice.notes,
        file_url=invoice.file_url, created_by=invoice.created_by, created_at=invoice.created_at,
        updated_at=invoice.updated_at or datetime.now()
    )
