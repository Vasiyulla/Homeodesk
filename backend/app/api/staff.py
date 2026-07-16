from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import uuid

from app.db.database import get_db
from app.db.models import User, OrganizationUser, EmployeeProfile, Department
from app.core.security import get_current_user, hash_password
from app.api.cases import get_user_org_id

router = APIRouter()

class EmployeeResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: Optional[str]
    role: str
    department: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class StaffCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    department_id: Optional[uuid.UUID] = None

@router.post("/staff", response_model=EmployeeResponse, status_code=201)
def create_staff(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    if not org_id:
        raise HTTPException(status_code=403, detail="User not part of an organization")

    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id
    ).first()

    if not org_user or org_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to add staff")

    existing = db.query(User).filter(User.email == staff_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        
    user = User(
        email=staff_in.email,
        hashed_password=hash_password(staff_in.password),
        full_name=staff_in.full_name,
    )
    db.add(user)
    db.flush()

    new_org_user = OrganizationUser(organization_id=org_id, user_id=user.id, role=staff_in.role)
    db.add(new_org_user)
    
    ep = EmployeeProfile(user_id=user.id, department_id=staff_in.department_id)
    db.add(ep)
    
    db.commit()
    db.refresh(user)
    
    dept_name = None
    if staff_in.department_id:
        d = db.query(Department).filter(Department.id == staff_in.department_id).first()
        dept_name = d.name if d else None

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": staff_in.role,
        "department": dept_name
    }


@router.get("/staff", response_model=List[EmployeeResponse])
def get_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    if not org_id:
        return []

    # Get all users in this org
    org_users = db.query(OrganizationUser, User, EmployeeProfile, Department)\
        .join(User, User.id == OrganizationUser.user_id)\
        .outerjoin(EmployeeProfile, EmployeeProfile.user_id == User.id)\
        .outerjoin(Department, Department.id == EmployeeProfile.department_id)\
        .filter(OrganizationUser.organization_id == org_id).all()
        
    result = []
    for ou, u, ep, d in org_users:
        result.append({
            "user_id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": ou.role,
            "department": d.name if d else None
        })
    return result
