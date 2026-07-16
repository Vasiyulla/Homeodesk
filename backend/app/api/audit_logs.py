"""
Audit Log API — View audit trail entries for the organization.

Provides:
- GET /api/audit-logs — Paginated, filterable audit log list
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import AuditLog, User, OrganizationUser
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    actor_id: Optional[uuid.UUID]
    action: str
    resource_type: str
    resource_id: Optional[str]
    payload_json: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime
    actor_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class PaginatedAuditLogs(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=PaginatedAuditLogs)
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)

    # Only OWNER/ADMIN can view audit logs
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id,
    ).first()
    if not org_user or org_user.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Admin or Owner role required")

    query = db.query(AuditLog).filter(AuditLog.organization_id == org_id)

    if action:
        query = query.filter(AuditLog.action == action.upper())
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)

    logs = (
        query
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Enrich with actor names
    actor_ids = {log.actor_id for log in logs if log.actor_id}
    actor_map = {}
    if actor_ids:
        users = db.query(User).filter(User.id.in_(actor_ids)).all()
        actor_map = {u.id: u.full_name or u.email for u in users}

    items = []
    for log in logs:
        item = AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            payload_json=log.payload_json,
            ip_address=log.ip_address,
            created_at=log.created_at,
            actor_name=actor_map.get(log.actor_id),
        )
        items.append(item)

    return PaginatedAuditLogs(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
