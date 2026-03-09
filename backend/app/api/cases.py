"""
Case management and decision logging endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.db.database import get_db
from app.db.models import Case, Decision, FollowUp, User

router = APIRouter()


# Pydantic schemas for request/response
class UserCreate(BaseModel):
    email: str
    full_name: Optional[str] = None
    license_number: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CaseCreate(BaseModel):
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: Optional[str] = None
    case_notes: Optional[str] = None
    symptoms: Optional[List[Dict[str, Any]]] = None
    mode: str = "clinical"


class CaseUpdate(BaseModel):
    case_notes: Optional[str] = None
    symptoms: Optional[List[Dict[str, Any]]] = None
    rag_analysis: Optional[Dict[str, Any]] = None


class CaseResponse(BaseModel):
    id: str
    patient_name: Optional[str]
    patient_age: Optional[int]
    chief_complaint: Optional[str]
    mode: str
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
    id: str
    case_id: str
    remedy_name: str
    potency: Optional[str]
    confidence: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FollowUpCreate(BaseModel):
    decision_id: Optional[str] = None
    days_since_dose: Optional[int] = None
    reaction: Optional[str] = None  # aggravation, amelioration, no_change, new_symptoms
    observations: Optional[str] = None
    new_symptoms: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None


class FollowUpResponse(BaseModel):
    id: str
    case_id: str
    reaction: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# User endpoints
@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a practitioner user."""
    db_user = User(email=user.email, full_name=user.full_name, license_number=user.license_number)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# Case endpoints
@router.post("/cases", response_model=CaseResponse)
def create_case(practitioner_id: str, case: CaseCreate, db: Session = Depends(get_db)):
    """Create a new case."""
    # Verify practitioner exists
    user = db.query(User).filter(User.id == practitioner_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    
    db_case = Case(
        practitioner_id=practitioner_id,
        patient_name=case.patient_name,
        patient_age=case.patient_age,
        patient_gender=case.patient_gender,
        chief_complaint=case.chief_complaint,
        case_notes=case.case_notes,
        symptoms=case.symptoms,
        mode=case.mode,
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case


@router.get("/cases/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    """Get case by ID."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.put("/cases/{case_id}", response_model=CaseResponse)
def update_case(case_id: str, case_update: CaseUpdate, db: Session = Depends(get_db)):
    """Update a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case_update.case_notes is not None:
        case.case_notes = case_update.case_notes
    if case_update.symptoms is not None:
        case.symptoms = case_update.symptoms
    if case_update.rag_analysis is not None:
        case.rag_analysis = case_update.rag_analysis
    
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return case


@router.get("/users/{practitioner_id}/cases", response_model=List[CaseResponse])
def list_user_cases(practitioner_id: str, db: Session = Depends(get_db)):
    """List all cases for a practitioner."""
    cases = db.query(Case).filter(Case.practitioner_id == practitioner_id).all()
    return cases


# Decision endpoints
@router.post("/cases/{case_id}/decisions", response_model=DecisionResponse)
def create_decision(case_id: str, decision: DecisionCreate, db: Session = Depends(get_db)):
    """Log a remedy decision for a case."""
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
    )
    db.add(db_decision)
    db.commit()
    db.refresh(db_decision)
    return db_decision


@router.get("/cases/{case_id}/decisions", response_model=List[DecisionResponse])
def get_case_decisions(case_id: str, db: Session = Depends(get_db)):
    """Get all decisions for a case."""
    decisions = db.query(Decision).filter(Decision.case_id == case_id).all()
    return decisions


# Follow-up endpoints
@router.post("/cases/{case_id}/follow-ups", response_model=FollowUpResponse)
def create_follow_up(case_id: str, follow_up: FollowUpCreate, db: Session = Depends(get_db)):
    """Log a follow-up observation for a case."""
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
def get_case_follow_ups(case_id: str, db: Session = Depends(get_db)):
    """Get all follow-ups for a case."""
    follow_ups = db.query(FollowUp).filter(FollowUp.case_id == case_id).all()
    return follow_ups


@router.get("/cases/{case_id}/audit-trail")
def get_case_audit_trail(case_id: str, db: Session = Depends(get_db)):
    """Get complete audit trail for a case (timeline of decisions and follow-ups)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    decisions = db.query(Decision).filter(Decision.case_id == case_id).all()
    follow_ups = db.query(FollowUp).filter(FollowUp.case_id == case_id).all()
    
    # Combine and sort by timestamp
    trail = []
    for d in decisions:
        trail.append({
            "type": "decision",
            "timestamp": d.created_at,
            "remedy": d.remedy_name,
            "confidence": d.confidence,
            "reasoning": d.reasoning,
        })
    for f in follow_ups:
        trail.append({
            "type": "follow-up",
            "timestamp": f.created_at,
            "reaction": f.reaction,
            "observations": f.observations,
        })
    
    trail.sort(key=lambda x: x["timestamp"])
    return {
        "case_id": case_id,
        "patient": case.patient_name,
        "audit_trail": trail
    }
