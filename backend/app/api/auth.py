"""
Authentication API — Registration and Login.

Provides:
- POST /api/auth/register — Create a new practitioner account
- POST /api/auth/login    — Authenticate and receive a JWT access token
- GET  /api/auth/me       — Get the current authenticated user's profile
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from jose import JWTError, jwt

from app.db.database import get_db
from app.db.models import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_current_user,
)
from app.core.config import settings
from app.main import limiter

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    license_number: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_type: Optional[str] = None
    employee_count: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


import uuid

class UserProfileResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    license_number: Optional[str]
    is_active: bool
    role: Optional[str] = None
    organization_id: Optional[uuid.UUID] = None
    organization_name: Optional[str] = None
    organization_clinic_type: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ── Endpoints ────────────────────────────────────────────────────────────────

from app.db.models import User, Organization, OrganizationUser

@router.post("/auth/register", response_model=UserProfileResponse, status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new practitioner account.
    Creates a default Organization (Clinic) for them.
    """
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        license_number=request.license_number,
    )
    db.add(user)
    db.flush() # get user id
    
    org_name = request.clinic_name or f"{request.full_name or 'Doctor'}'s Clinic"
    org = Organization(
        name=org_name,
        clinic_type=request.clinic_type,
        employee_count=request.employee_count
    )
    db.add(org)
    db.flush()
    
    org_user = OrganizationUser(organization_id=org.id, user_id=user.id, role="OWNER")
    db.add(org_user)

    db.commit()
    db.refresh(user)
    
    # attach for response
    user.role = "OWNER"
    user.organization_id = org.id
    user.organization_name = org.name
    user.organization_clinic_type = org.clinic_type
    return user


@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Authenticate with email + password and receive a JWT access token.
    Uses OAuth2 password flow (form fields: ``username``, ``password``).
    The ``username`` field should contain the user's email.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Set HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
        max_age=7 * 24 * 60 * 60, # 7 days
    )

    return TokenResponse(access_token=access_token)

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_access_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    """
    Use an HttpOnly refresh token cookie to get a new access token.
    """
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    import uuid
    user_id = uuid.UUID(user_id_str)
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    new_access_token = create_access_token(data={"sub": str(user.id)})
    
    # Optional: Rotate refresh token on use
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    
    return TokenResponse(access_token=new_access_token)


@router.get("/auth/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Return the profile of the currently authenticated user.
    Requires a valid Bearer token.
    """
    org_user = db.query(OrganizationUser).filter(OrganizationUser.user_id == current_user.id).first()
    if org_user:
        current_user.role = org_user.role
        current_user.organization_id = org_user.organization_id
        org = db.query(Organization).filter(Organization.id == org_user.organization_id).first()
        current_user.organization_name = org.name if org else None
        current_user.organization_clinic_type = org.clinic_type if org else None
    else:
        current_user.role = None
        current_user.organization_id = None
        current_user.organization_name = None
        current_user.organization_clinic_type = None
        
    return current_user
