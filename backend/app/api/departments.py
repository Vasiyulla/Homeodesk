from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime

from app.db.database import get_db
from app.db.models import Department, User, OrganizationUser
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

@router.post("/departments", response_model=DepartmentResponse, status_code=201)
def create_department(
    department_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    if not org_id:
        raise HTTPException(status_code=403, detail="User not part of an organization")

    # verify user is ADMIN or OWNER
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == current_user.id,
        OrganizationUser.organization_id == org_id
    ).first()

    if not org_user or org_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to create departments")

    db_dept = Department(
        organization_id=org_id,
        name=department_in.name,
        description=department_in.description
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_user_org_id(db, current_user.id)
    if not org_id:
        return []
    
    return db.query(Department).filter(Department.organization_id == org_id).all()

@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(
    dept_id: uuid.UUID,
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
        raise HTTPException(status_code=403, detail="Not authorized to delete departments")

    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    db.delete(dept)
    db.commit()
    return None
