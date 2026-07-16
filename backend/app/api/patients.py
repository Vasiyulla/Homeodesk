from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, cast, String
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Patient, User, Case, Decision, FollowUp
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()

class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    contact_info: Optional[dict] = None

class PatientResponse(BaseModel):
    id: uuid.UUID
    organization_id: Optional[uuid.UUID]
    display_id: Optional[str] = None
    name: str
    age: Optional[int]
    gender: Optional[str]
    contact_info: Optional[dict]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CaseSummary(BaseModel):
    id: uuid.UUID
    status: str
    chief_complaint: Optional[str]
    remedy_name: Optional[str] = None
    follow_up_count: int = 0
    updated_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PatientDetailResponse(BaseModel):
    id: uuid.UUID
    organization_id: Optional[uuid.UUID]
    display_id: Optional[str] = None
    name: str
    age: Optional[int]
    gender: Optional[str]
    contact_info: Optional[dict]
    created_at: datetime
    cases: List[CaseSummary]
    model_config = ConfigDict(from_attributes=True)


@router.post("/patients", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    count = db.query(Patient).filter(Patient.organization_id == org_id).count()
    new_display_id = f"P-{1001 + count}"
    
    db_patient = Patient(
        display_id=new_display_id,
        organization_id=org_id,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        contact_info=patient.contact_info
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/patients", response_model=List[PatientResponse])
def get_patients(
    q: Optional[str] = Query(None, description="Search patients by name, display ID, or phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    query = db.query(Patient).filter(Patient.organization_id == org_id)

    if q:
        search_term = f"%{q}%"
        # Search by name, display_id, or phone in contact_info JSON
        query = query.filter(
            or_(
                Patient.name.ilike(search_term),
                Patient.display_id.ilike(search_term),
                cast(Patient.contact_info, String).ilike(search_term),
            )
        )

    return query.order_by(Patient.created_at.desc()).all()

@router.get("/patients/{patient_id}", response_model=PatientDetailResponse)
def get_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.organization_id == org_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    cases = (
        db.query(Case)
        .filter(Case.patient_id == patient_id)
        .order_by(Case.created_at.desc())
        .all()
    )

    case_summaries = []
    for c in cases:
        fu_count = db.query(func.count(FollowUp.id)).filter(FollowUp.case_id == c.id).scalar() or 0
        case_summaries.append(CaseSummary(
            id=c.id,
            status=c.status,
            chief_complaint=c.chief_complaint,
            remedy_name=c.remedy_name,
            follow_up_count=fu_count,
            updated_at=c.updated_at,
            created_at=c.created_at,
        ))

    return PatientDetailResponse(
        id=patient.id,
        organization_id=patient.organization_id,
        display_id=patient.display_id,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        contact_info=patient.contact_info,
        created_at=patient.created_at,
        cases=case_summaries,
    )


class PatientVitalCreate(BaseModel):
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_pressure: Optional[str] = None
    temperature: Optional[float] = None
    pulse: Optional[int] = None
    notes: Optional[str] = None

class PatientVitalResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    recorded_by_id: uuid.UUID
    height: Optional[float]
    weight: Optional[float]
    blood_pressure: Optional[str]
    temperature: Optional[float]
    pulse: Optional[int]
    notes: Optional[str]
    recorded_at: datetime
    model_config = ConfigDict(from_attributes=True)


from app.db.models import PatientVital

@router.post("/patients/{patient_id}/vitals", response_model=PatientVitalResponse)
def add_patient_vitals(
    patient_id: uuid.UUID,
    vitals: PatientVitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.organization_id == org_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db_vital = PatientVital(
        patient_id=patient_id,
        recorded_by_id=current_user.id,
        organization_id=org_id,
        height=vitals.height,
        weight=vitals.weight,
        blood_pressure=vitals.blood_pressure,
        temperature=vitals.temperature,
        pulse=vitals.pulse,
        notes=vitals.notes
    )
    db.add(db_vital)
    db.commit()
    db.refresh(db_vital)
    return db_vital

@router.get("/patients/{patient_id}/vitals", response_model=List[PatientVitalResponse])
def get_patient_vitals(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.organization_id == org_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = (
        db.query(PatientVital)
        .filter(PatientVital.patient_id == patient_id)
        .order_by(PatientVital.recorded_at.desc())
        .all()
    )
    return vitals


# ── Full Case History ───────────────────────────────────────────────────────

class FollowUpDetail(BaseModel):
    id: uuid.UUID
    days_since_dose: Optional[int] = None
    reaction: Optional[str] = None
    observations: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DecisionDetail(BaseModel):
    id: uuid.UUID
    remedy_name: str
    potency: Optional[str] = None
    dose: Optional[str] = None
    reasoning: Optional[str] = None
    confidence: str = "medium"
    dispense_status: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CaseHistoryItem(BaseModel):
    id: uuid.UUID
    status: str
    chief_complaint: Optional[str] = None
    case_notes: Optional[str] = None
    remedy_name: Optional[str] = None
    potency: Optional[str] = None
    mode: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    decisions: List[DecisionDetail]
    follow_ups: List[FollowUpDetail]
    model_config = ConfigDict(from_attributes=True)


class PatientCaseHistoryResponse(BaseModel):
    patient: PatientResponse
    total_cases: int
    cases: List[CaseHistoryItem]
    model_config = ConfigDict(from_attributes=True)


@router.get("/patients/{patient_id}/case-history", response_model=PatientCaseHistoryResponse)
def get_patient_case_history(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the full case history for a patient including all decisions and follow-ups."""
    org_id = get_user_org_id(db, current_user.id)
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.organization_id == org_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    cases = (
        db.query(Case)
        .options(joinedload(Case.decisions), joinedload(Case.follow_ups))
        .filter(Case.patient_id == patient_id)
        .order_by(Case.created_at.desc())
        .all()
    )

    case_items = []
    for c in cases:
        decisions = sorted(c.decisions, key=lambda d: d.created_at, reverse=True)
        follow_ups = sorted(c.follow_ups, key=lambda f: f.created_at, reverse=True)
        case_items.append(CaseHistoryItem(
            id=c.id,
            status=c.status,
            chief_complaint=c.chief_complaint,
            case_notes=c.case_notes,
            remedy_name=c.remedy_name,
            potency=c.potency,
            mode=c.mode,
            created_at=c.created_at,
            updated_at=c.updated_at,
            decisions=[DecisionDetail.model_validate(d) for d in decisions],
            follow_ups=[FollowUpDetail.model_validate(f) for f in follow_ups],
        ))

    return PatientCaseHistoryResponse(
        patient=PatientResponse.model_validate(patient),
        total_cases=len(case_items),
        cases=case_items,
    )
