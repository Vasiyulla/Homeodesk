"""
Analytics API — Clinic-wide summary statistics for Owners/Admins.

Provides:
- GET /api/analytics/summary       — Total patients, cases, revenue, pending
- GET /api/analytics/cases-over-time — Weekly case creation counts (last 12 weeks)
- GET /api/analytics/top-remedies   — Top 10 most-prescribed remedies
- GET /api/analytics/staff-activity — Cases per doctor, doses per nurse
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import uuid

from app.db.database import get_db
from app.db.models import (
    User, OrganizationUser, Patient, Case, Decision,
    DoseAdministrationLog, Invoice,
)
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class SummaryResponse(BaseModel):
    total_patients: int
    total_cases: int
    active_cases: int
    closed_cases: int
    total_revenue: float
    pending_revenue: float
    total_staff: int


class WeeklyCount(BaseModel):
    week_label: str
    count: int


class TopRemedy(BaseModel):
    remedy_name: str
    prescription_count: int


class StaffActivityItem(BaseModel):
    user_id: str
    full_name: Optional[str]
    role: str
    metric_label: str
    metric_value: int


# ── Helper: enforce OWNER/ADMIN ─────────────────────────────────────────────

def require_admin_or_owner(db: Session, user_id, org_id):
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == user_id,
        OrganizationUser.organization_id == org_id,
    ).first()
    if not org_user or org_user.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Admin or Owner role required")
    return org_user


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/analytics/summary", response_model=SummaryResponse)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    require_admin_or_owner(db, current_user.id, org_id)

    total_patients = db.query(func.count(Patient.id)).filter(
        Patient.organization_id == org_id
    ).scalar() or 0

    total_cases = db.query(func.count(Case.id)).filter(
        Case.organization_id == org_id
    ).scalar() or 0

    active_cases = db.query(func.count(Case.id)).filter(
        Case.organization_id == org_id,
        Case.status.notin_(["CLOSED"]),
    ).scalar() or 0

    closed_cases = total_cases - active_cases

    total_revenue = db.query(func.coalesce(func.sum(Invoice.amount_due), 0.0)).filter(
        Invoice.organization_id == org_id,
        Invoice.status == "PAID",
    ).scalar() or 0.0

    pending_revenue = db.query(func.coalesce(func.sum(Invoice.amount_due), 0.0)).filter(
        Invoice.organization_id == org_id,
        Invoice.status == "PENDING",
    ).scalar() or 0.0

    total_staff = db.query(func.count(OrganizationUser.id)).filter(
        OrganizationUser.organization_id == org_id,
    ).scalar() or 0

    return SummaryResponse(
        total_patients=total_patients,
        total_cases=total_cases,
        active_cases=active_cases,
        closed_cases=closed_cases,
        total_revenue=float(total_revenue),
        pending_revenue=float(pending_revenue),
        total_staff=total_staff,
    )


@router.get("/analytics/cases-over-time", response_model=List[WeeklyCount])
def get_cases_over_time(
    weeks: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    require_admin_or_owner(db, current_user.id, org_id)

    now = datetime.now(timezone.utc)
    results: List[WeeklyCount] = []

    for i in range(weeks - 1, -1, -1):
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        count = db.query(func.count(Case.id)).filter(
            Case.organization_id == org_id,
            Case.created_at >= week_start,
            Case.created_at < week_end,
        ).scalar() or 0
        label = week_start.strftime("%b %d")
        results.append(WeeklyCount(week_label=label, count=count))

    return results


@router.get("/analytics/top-remedies", response_model=List[TopRemedy])
def get_top_remedies(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    require_admin_or_owner(db, current_user.id, org_id)

    rows = (
        db.query(
            Decision.remedy_name,
            func.count(Decision.id).label("cnt"),
        )
        .join(Case, Case.id == Decision.case_id)
        .filter(Case.organization_id == org_id)
        .group_by(Decision.remedy_name)
        .order_by(desc("cnt"))
        .limit(limit)
        .all()
    )

    return [
        TopRemedy(remedy_name=row[0], prescription_count=row[1])
        for row in rows
    ]


@router.get("/analytics/staff-activity", response_model=List[StaffActivityItem])
def get_staff_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    require_admin_or_owner(db, current_user.id, org_id)

    activity: List[StaffActivityItem] = []

    # Doctors: count of cases assigned
    doctor_rows = (
        db.query(
            User.id,
            User.full_name,
            func.count(Case.id).label("cnt"),
        )
        .join(OrganizationUser, and_(
            OrganizationUser.user_id == User.id,
            OrganizationUser.organization_id == org_id,
            OrganizationUser.role == "DOCTOR",
        ))
        .outerjoin(Case, Case.assigned_doctor_id == User.id)
        .group_by(User.id, User.full_name)
        .all()
    )
    for row in doctor_rows:
        activity.append(StaffActivityItem(
            user_id=str(row[0]),
            full_name=row[1],
            role="DOCTOR",
            metric_label="Cases Assigned",
            metric_value=row[2],
        ))

    # Nurses: count of dose logs
    nurse_rows = (
        db.query(
            User.id,
            User.full_name,
            func.count(DoseAdministrationLog.id).label("cnt"),
        )
        .join(OrganizationUser, and_(
            OrganizationUser.user_id == User.id,
            OrganizationUser.organization_id == org_id,
            OrganizationUser.role == "NURSE",
        ))
        .outerjoin(DoseAdministrationLog, DoseAdministrationLog.administered_by_id == User.id)
        .group_by(User.id, User.full_name)
        .all()
    )
    for row in nurse_rows:
        activity.append(StaffActivityItem(
            user_id=str(row[0]),
            full_name=row[1],
            role="NURSE",
            metric_label="Doses Administered",
            metric_value=row[2],
        ))

    return activity
