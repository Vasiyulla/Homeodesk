from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Invoice, InvoiceItem, User, OrganizationUser, Patient
from app.core.security import get_current_user
from app.api.cases import get_user_org_id
from app.core.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

class InvoiceItemCreate(BaseModel):
    description: str
    amount: float

class InvoiceCreate(BaseModel):
    patient_id: uuid.UUID
    case_id: Optional[uuid.UUID] = None
    items: List[InvoiceItemCreate]
    due_date: Optional[datetime] = None

class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    description: str
    amount: float
    model_config = ConfigDict(from_attributes=True)

class InvoiceResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    patient_id: uuid.UUID
    case_id: Optional[uuid.UUID]
    amount_due: float
    status: str
    payment_method: Optional[str] = None
    due_date: Optional[datetime]
    created_at: datetime
    items: List[InvoiceItemResponse]
    model_config = ConfigDict(from_attributes=True)


from app.websockets.manager import manager

@router.post("/billing/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id
    ).first()

    if not org_user or org_user.role not in ["OWNER", "ADMIN", "ASSISTANT"]:
        raise HTTPException(status_code=403, detail="Not authorized to create invoices")

    total_amount = sum(item.amount for item in invoice_in.items)

    db_invoice = Invoice(
        organization_id=org_id,
        patient_id=invoice_in.patient_id,
        case_id=invoice_in.case_id,
        amount_due=total_amount,
        status="PENDING",
        due_date=invoice_in.due_date
    )
    db.add(db_invoice)
    db.flush()

    for item in invoice_in.items:
        db_item = InvoiceItem(
            invoice_id=db_invoice.id,
            description=item.description,
            amount=item.amount
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_invoice)

    if org_id:
        await manager.broadcast(str(org_id), "billing", {
            "event": "invoice_created",
            "invoice_id": str(db_invoice.id)
        })

    return db_invoice


@router.get("/billing/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    return db.query(Invoice).filter(Invoice.organization_id == org_id).order_by(Invoice.created_at.desc()).all()


class PayInvoiceRequest(BaseModel):
    payment_method: str = "CASH"

@router.put("/billing/invoices/{invoice_id}/pay", response_model=InvoiceResponse)
async def pay_invoice(
    invoice_id: uuid.UUID,
    pay_request: PayInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id
    ).first()

    if not org_user or org_user.role not in ["OWNER", "ADMIN", "ASSISTANT"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify invoices")

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.organization_id == org_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = "PAID"
    invoice.payment_method = pay_request.payment_method.upper()
    db.commit()
    db.refresh(invoice)

    if org_id:
        await manager.broadcast(str(org_id), "billing", {
            "event": "invoice_paid",
            "invoice_id": str(invoice.id)
        })

    return invoice

class CheckoutResponse(BaseModel):
    url: str

@router.post("/billing/invoices/{invoice_id}/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id
    ).first()

    if not org_user or org_user.role not in ["OWNER", "ADMIN", "ASSISTANT"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.organization_id == org_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.status == "PAID":
        raise HTTPException(status_code=400, detail="Invoice already paid")

    patient = db.query(Patient).filter(Patient.id == invoice.patient_id).first()
    patient_name = patient.name if patient else "Patient"

    # Create Stripe Checkout Session
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"Invoice for {patient_name}",
                        'description': "Medical consultation and services",
                    },
                    'unit_amount': int(invoice.amount_due * 100), # Stripe expects cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/admin?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/admin?payment=cancelled",
            client_reference_id=str(invoice.id),
            metadata={
                "invoice_id": str(invoice.id),
                "organization_id": str(invoice.organization_id)
            }
        )
        return CheckoutResponse(url=session.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from fastapi import Request

@router.post("/billing/stripe-webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        invoice_id_str = session.get('metadata', {}).get('invoice_id')
        org_id_str = session.get('metadata', {}).get('organization_id')
        
        if invoice_id_str:
            try:
                invoice_id = uuid.UUID(invoice_id_str)
                invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
                if invoice and invoice.status != "PAID":
                    invoice.status = "PAID"
                    invoice.payment_method = "ONLINE"
                    db.commit()
                    
                    if org_id_str:
                        await manager.broadcast(org_id_str, "billing", {
                            "event": "invoice_paid",
                            "invoice_id": str(invoice.id)
                        })
            except Exception as e:
                print(f"Error processing webhook: {e}")

    return {"status": "success"}
