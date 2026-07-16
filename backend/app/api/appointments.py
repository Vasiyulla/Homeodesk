from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.db.database import get_db
from app.db.models import Appointment, User
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()

class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    scheduled_time: datetime
    status: str = "scheduled"
    appointment_type: str = "in_person"
    meeting_link: Optional[str] = None
    is_emergency: bool = False

class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID]
    organization_id: Optional[uuid.UUID]
    scheduled_time: datetime
    status: str
    appointment_type: str
    meeting_link: Optional[str]
    checked_in_at: Optional[datetime]
    is_emergency: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

@router.post("/appointments", response_model=AppointmentResponse)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    db_appt = Appointment(
        organization_id=org_id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        scheduled_time=appointment.scheduled_time,
        status=appointment.status,
        appointment_type=appointment.appointment_type,
        meeting_link=appointment.meeting_link,
        is_emergency=appointment.is_emergency
    )
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    # Return all appointments for this organization
    return db.query(Appointment).filter(Appointment.organization_id == org_id).order_by(Appointment.scheduled_time.asc()).all()

from app.websockets.manager import manager

@router.put("/appointments/{appt_id}/checkin", response_model=AppointmentResponse)
async def checkin_appointment(
    appt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    appt = db.query(Appointment).filter(Appointment.id == appt_id, Appointment.organization_id == org_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appt.status = "ARRIVED"
    appt.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(appt)
    
    # Broadcast event
    if org_id:
        await manager.broadcast(str(org_id), "waiting_room", {
            "event": "patient_checked_in",
            "appointment_id": str(appt_id)
        })
        
    return appt

@router.get("/appointments/waiting-room", response_model=List[AppointmentResponse])
def get_waiting_room_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    return db.query(Appointment).filter(
        Appointment.organization_id == org_id,
        Appointment.status == "ARRIVED"
    ).order_by(Appointment.checked_in_at.asc()).all()

@router.put("/appointments/{appt_id}/complete", response_model=AppointmentResponse)
async def complete_appointment(
    appt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    appt = db.query(Appointment).filter(Appointment.id == appt_id, Appointment.organization_id == org_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appt.status = "COMPLETED"
    db.commit()
    db.refresh(appt)
    
    # Broadcast event so waiting room updates immediately
    if org_id:
        await manager.broadcast(str(org_id), "waiting_room", {
            "event": "patient_checked_in", # reuse the same event to trigger refetch
            "appointment_id": str(appt_id)
        })
        
    return appt
