"""
Case management and decision logging endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Case, Decision, FollowUp, User, OrganizationUser, Patient, Invoice, InvoiceItem
from app.core.security import get_current_user
from app.websockets.manager import manager

router = APIRouter()

# Pydantic schemas for request/response
class CaseCreate(BaseModel):
    patient_id: Optional[uuid.UUID] = None
    patient_name: Optional[str] = None # temporary for backward compat
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: Optional[str] = None
    case_notes: Optional[str] = None
    symptoms: Optional[List[Dict[str, Any]]] = None
    mode: str = "clinical"
    remedy_name: Optional[str] = None
    potency: Optional[str] = None

class CaseUpdate(BaseModel):
    case_notes: Optional[str] = None
    symptoms: Optional[List[Dict[str, Any]]] = None
    rag_analysis: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    assigned_doctor_id: Optional[uuid.UUID] = None
    remedy_name: Optional[str] = None
    potency: Optional[str] = None

class CaseResponse(BaseModel):
    id: uuid.UUID
    patient_id: Optional[uuid.UUID]
    patient_name: Optional[str] = None
    patient_display_id: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    status: str
    assigned_doctor_id: Optional[uuid.UUID]
    created_by_id: Optional[uuid.UUID]
    chief_complaint: Optional[str]
    mode: str
    remedy_name: Optional[str] = None
    potency: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DecisionCreate(BaseModel):
    remedy_name: str
    potency: Optional[str] = None
    dose: Optional[str] = None
    reasoning: Optional[str] = None
    rejected_remedies: Optional[List[str]] = None
    supporting_rubrics: Optional[List[str]] = None
    confidence: str = "medium"

class DecisionResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    remedy_name: str
    potency: Optional[str]
    confidence: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FollowUpCreate(BaseModel):
    decision_id: Optional[uuid.UUID] = None
    days_since_dose: Optional[int] = None
    reaction: Optional[str] = None
    observations: Optional[str] = None
    new_symptoms: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class FollowUpResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    days_since_dose: Optional[int] = None
    reaction: Optional[str]
    observations: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Helper to get user's org
def get_user_org_id(db, user_id):
    org_user = db.query(OrganizationUser).filter(OrganizationUser.user_id == user_id).first()
    return org_user.organization_id if org_user else None

@router.post("/cases", response_model=CaseResponse)
def create_case(
    case: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    
    # Handle patient creation for backwards compatibility if patient_id is not provided
    p_id = case.patient_id
    if not p_id and case.patient_name:
        new_pat = Patient(name=case.patient_name, age=case.patient_age, gender=case.patient_gender, organization_id=org_id)
        db.add(new_pat)
        db.flush()
        p_id = new_pat.id

    db_case = Case(
        organization_id=org_id,
        patient_id=p_id,
        created_by_id=current_user.id,
        chief_complaint=case.chief_complaint,
        case_notes=case.case_notes,
        symptoms=case.symptoms,
        mode=case.mode,
        status="DRAFT"
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.get("/cases/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/cases/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: uuid.UUID,
    case_update: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case_update.case_notes is not None:
        case.case_notes = case_update.case_notes
    if case_update.symptoms is not None:
        case.symptoms = case_update.symptoms
    if case_update.rag_analysis is not None:
        case.rag_analysis = case_update.rag_analysis
    if case_update.status is not None:
        case.status = case_update.status
    if case_update.assigned_doctor_id is not None:
        case.assigned_doctor_id = case_update.assigned_doctor_id
    if case_update.remedy_name is not None:
        case.remedy_name = case_update.remedy_name
    if case_update.potency is not None:
        case.potency = case_update.potency
    
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return case

@router.get("/my-cases", response_model=List[CaseResponse])
def list_my_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    cases = db.query(Case).filter(Case.organization_id == org_id).order_by(Case.created_at.desc()).all()
    return cases

@router.post("/cases/{case_id}/decisions", response_model=DecisionResponse)
async def create_decision(
    case_id: uuid.UUID,
    decision: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    db_decision = Decision(
        case_id=case_id,
        remedy_name=decision.remedy_name,
        potency=decision.potency,
        dose=decision.dose,
        reasoning=decision.reasoning,
        rejected_remedies=decision.rejected_remedies,
        supporting_rubrics=decision.supporting_rubrics,
        confidence=decision.confidence,
        dispense_status="PENDING",
    )
    
    # Auto-update case status
    if case.status in ["DRAFT", "WAITING_FOR_DOCTOR"]:
        case.status = "REMEDY_PRESCRIBED"
        
    db.add(db_decision)
    
    # Auto-generate Invoice (Zero-Touch Billing)
    if case.patient_id:
        existing_decisions = db.query(Decision).filter(Decision.case_id == case_id).count()
        is_follow_up = existing_decisions > 0
        
        consultation_fee = 150.0 if is_follow_up else 300.0
        consultation_desc = "Follow-up Consultation Fee" if is_follow_up else "Consultation Fee"
        medicine_fee = 200.0
        
        db_invoice = Invoice(
            organization_id=case.organization_id,
            patient_id=case.patient_id,
            case_id=case.id,
            amount_due=consultation_fee + medicine_fee,
            status="PENDING"
        )
        db.add(db_invoice)
        db.flush() # get invoice ID without committing the whole transaction yet
        
        db_item1 = InvoiceItem(invoice_id=db_invoice.id, description=consultation_desc, amount=consultation_fee)
        db_item2 = InvoiceItem(invoice_id=db_invoice.id, description=f"Medicine: {decision.remedy_name} {decision.potency}", amount=medicine_fee)
        db.add(db_item1)
        db.add(db_item2)

    db.commit()
    db.refresh(db_decision)
    
    # Broadcast event so assistant dashboard updates instantly
    if case.organization_id and case.patient_id:
        await manager.broadcast(str(case.organization_id), "billing", {
            "event": "invoice_created"
        })
        
    return db_decision

@router.get("/cases/{case_id}/decisions", response_model=List[DecisionResponse])
def get_case_decisions(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decisions = db.query(Decision).filter(Decision.case_id == case_id).all()
    return decisions

@router.post("/cases/{case_id}/follow-ups", response_model=FollowUpResponse)
def create_follow_up(
    case_id: uuid.UUID,
    follow_up: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    db_follow_up = FollowUp(
        case_id=case_id,
        decision_id=follow_up.decision_id,
        days_since_dose=follow_up.days_since_dose,
        reaction=follow_up.reaction,
        observations=follow_up.observations,
        new_symptoms=follow_up.new_symptoms,
        notes=follow_up.notes,
    )
    db.add(db_follow_up)
    db.commit()
    db.refresh(db_follow_up)
    return db_follow_up

@router.get("/cases/{case_id}/follow-ups", response_model=List[FollowUpResponse])
def get_case_follow_ups(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow_ups = db.query(FollowUp).filter(FollowUp.case_id == case_id).all()
    return follow_ups
