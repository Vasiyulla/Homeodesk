from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user
from app.db.models import User, OrganizationUser

class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        # For a user to have a role, they must be associated with an organization in OrganizationUser.
        # This basic implementation checks if the user has ANY OrganizationUser record with an allowed role.
        # A more advanced version would take the organization_id from the request headers/path.
        
        user_roles = db.query(OrganizationUser.role).filter(OrganizationUser.user_id == current_user.id).all()
        user_roles = [r[0] for r in user_roles]
        
        has_access = any(role in self.allowed_roles for role in user_roles)
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of the following roles: {', '.join(self.allowed_roles)}"
            )
            
        return current_user
