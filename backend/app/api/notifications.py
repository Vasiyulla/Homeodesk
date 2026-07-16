import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.db.database import get_db
from app.db.models import Notification, User
from app.core.security import get_current_user
from app.api.cases import get_user_org_id

router = APIRouter()

class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    is_read: bool
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the latest notifications for the current user."""
    org_id = get_user_org_id(db, current_user.id)
    
    notifications = (
        db.query(Notification)
        .filter(
            Notification.organization_id == org_id,
            (Notification.user_id == current_user.id) | (Notification.user_id == None)
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return notifications


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    org_id = get_user_org_id(db, current_user.id)
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.organization_id == org_id,
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications for the current user as read."""
    org_id = get_user_org_id(db, current_user.id)
    
    db.query(Notification).filter(
        Notification.organization_id == org_id,
        (Notification.user_id == current_user.id) | (Notification.user_id == None),
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
