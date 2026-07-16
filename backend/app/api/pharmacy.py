"""
Pharmacy / Dispensary API Endpoints

Provides the prescription queue for pharmacists/nurses to view and dispense medicines.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.db.database import get_db
from app.db.models import Decision, Case, Patient, User, DoseAdministrationLog, OrganizationUser
from app.core.security import get_current_user

router = APIRouter()


def _get_user_org_id(db: Session, user_id):
    org_user = db.query(OrganizationUser).filter(OrganizationUser.user_id == user_id).first()
    return org_user.organization_id if org_user else None


class PrescriptionItem(BaseModel):
    decision_id: uuid.UUID
    case_id: uuid.UUID
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    remedy_name: str
    potency: Optional[str] = None
    dose: Optional[str] = None
    doctor_name: Optional[str] = None
    prescribed_at: datetime
    dispense_status: str
    dispensed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class DispenseRequest(BaseModel):
    notes: Optional[str] = None


@router.get("/pharmacy/queue", response_model=List[PrescriptionItem])
def get_pharmacy_queue(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the pharmacy prescription queue.
    Returns all decisions with the given dispense_status for the current organization.
    """
    org_id = _get_user_org_id(db, current_user.id)

    query = (
        db.query(Decision, Case, Patient, User)
        .join(Case, Decision.case_id == Case.id)
        .outerjoin(Patient, Case.patient_id == Patient.id)
        .outerjoin(User, Case.created_by_id == User.id)
        .filter(Case.organization_id == org_id)
        .filter(Decision.dispense_status == status.upper())
        .order_by(Decision.created_at.desc())
    )

    results = []
    for decision, case, patient, doctor in query.all():
        # Try to find the prescribing doctor (assigned or creator)
        prescribing_doctor = None
        if case.assigned_doctor_id:
            prescribing_doctor = db.query(User).filter(User.id == case.assigned_doctor_id).first()
        if not prescribing_doctor and doctor:
            prescribing_doctor = doctor

        results.append(PrescriptionItem(
            decision_id=decision.id,
            case_id=case.id,
            patient_name=patient.name if patient else "Unknown",
            patient_age=patient.age if patient else None,
            patient_gender=patient.gender if patient else None,
            remedy_name=decision.remedy_name,
            potency=decision.potency,
            dose=decision.dose,
            doctor_name=prescribing_doctor.full_name if prescribing_doctor else "Unknown",
            prescribed_at=decision.created_at,
            dispense_status=decision.dispense_status,
            dispensed_at=decision.dispensed_at,
        ))

    return results


@router.post("/pharmacy/queue/{decision_id}/dispense")
def dispense_prescription(
    decision_id: uuid.UUID,
    request: DispenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a prescription as dispensed.
    Also creates a DoseAdministrationLog entry.
    """
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if decision.dispense_status == "DISPENSED":
        raise HTTPException(status_code=400, detail="Already dispensed")

    # Update decision
    decision.dispense_status = "DISPENSED"
    decision.dispensed_at = datetime.now(timezone.utc)
    decision.dispensed_by_id = current_user.id

    # Create dose log
    case = db.query(Case).filter(Case.id == decision.case_id).first()
    if case and case.patient_id:
        dose_log = DoseAdministrationLog(
            case_id=decision.case_id,
            patient_id=case.patient_id,
            administered_by_id=current_user.id,
            remedy_name=decision.remedy_name,
            dose=decision.dose or "As prescribed",
            potency=decision.potency,
            notes=request.notes,
        )
        db.add(dose_log)

    db.commit()
    db.refresh(decision)

    return {
        "status": "success",
        "message": f"{decision.remedy_name} dispensed successfully",
        "decision_id": str(decision.id),
        "dispensed_at": decision.dispensed_at.isoformat() if decision.dispensed_at else None,
    }


@router.get("/pharmacy/stats")
def get_pharmacy_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pharmacy queue counts."""
    org_id = _get_user_org_id(db, current_user.id)

    pending = (
        db.query(Decision)
        .join(Case, Decision.case_id == Case.id)
        .filter(Case.organization_id == org_id)
        .filter(Decision.dispense_status == "PENDING")
        .count()
    )

    dispensed_today = (
        db.query(Decision)
        .join(Case, Decision.case_id == Case.id)
        .filter(Case.organization_id == org_id)
        .filter(Decision.dispense_status == "DISPENSED")
        .filter(Decision.dispensed_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0))
        .count()
    )

    return {
        "pending": pending,
        "dispensed_today": dispensed_today,
    }
