from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import DoseAdministrationLog, User, Case
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()

class DoseLogCreate(BaseModel):
    case_id: uuid.UUID
    remedy_name: str
    dose: str
    potency: Optional[str] = None
    immediate_reaction: Optional[str] = None
    notes: Optional[str] = None

class DoseLogResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    patient_id: uuid.UUID
    administered_by_id: uuid.UUID
    remedy_name: str
    dose: str
    potency: Optional[str]
    administered_at: datetime
    immediate_reaction: Optional[str]
    notes: Optional[str]
    model_config = ConfigDict(from_attributes=True)

from app.websockets.manager import manager

@router.post("/doses", response_model=DoseLogResponse)
async def log_dose(
    log_data: DoseLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == log_data.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    db_log = DoseAdministrationLog(
        case_id=case.id,
        patient_id=case.patient_id,
        administered_by_id=current_user.id,
        remedy_name=log_data.remedy_name,
        dose=log_data.dose,
        potency=log_data.potency,
        immediate_reaction=log_data.immediate_reaction,
        notes=log_data.notes
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    # Broadcast event
    org_id = get_user_org_id(db, current_user.id)
    if org_id:
        await manager.broadcast(str(org_id), "nurse_ward", {
            "event": "dose_logged",
            "case_id": str(case.id)
        })
        
    return db_log

@router.get("/cases/{case_id}/doses", response_model=List[DoseLogResponse])
def get_case_doses(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(DoseAdministrationLog).filter(DoseAdministrationLog.case_id == case_id).all()
