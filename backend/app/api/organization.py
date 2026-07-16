from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from app.db.database import get_db
from app.db.models import User, OrganizationUser, Organization
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()

class OrganizationUpdate(BaseModel):
    name: str

@router.put("/organization/settings", status_code=200)
def update_organization_settings(
    settings: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the organization settings (e.g. name for branding).
    Only OWNER or ADMIN can do this.
    """
    org_id = get_user_org_id(db, current_user.id)
    if not org_id:
        raise HTTPException(status_code=403, detail="User not part of an organization")

    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id
    ).first()

    if not org_user or org_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to update organization settings")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.name = settings.name
    db.commit()
    db.refresh(org)

    return {"message": "Organization updated successfully", "name": org.name}
