from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user_ws
from app.websockets.manager import manager
from app.api.cases import get_user_org_id

router = APIRouter()

async def get_ws_context(websocket: WebSocket, token: str | None = None, db: Session = Depends(get_db)):
    if not token:
        await websocket.close(code=1008)
        return None, None
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=1008)
        return None, None
    
    org_id = get_user_org_id(db, user.id)
    if not org_id:
        await websocket.close(code=1008)
        return None, None
        
    return user, str(org_id)

@router.websocket("/ws/waiting-room")
async def websocket_waiting_room(websocket: WebSocket, token: str | None = None, db: Session = Depends(get_db)):
    user, org_id = await get_ws_context(websocket, token, db)
    if not user:
        return
        
    await manager.connect(websocket, org_id, "waiting_room")
    try:
        while True:
            # We don't expect client messages currently, just ping/pong or keepalive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id, "waiting_room")

@router.websocket("/ws/billing")
async def websocket_billing(websocket: WebSocket, token: str | None = None, db: Session = Depends(get_db)):
    user, org_id = await get_ws_context(websocket, token, db)
    if not user:
        return
        
    await manager.connect(websocket, org_id, "billing")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id, "billing")

@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str | None = None, db: Session = Depends(get_db)):
    user, org_id = await get_ws_context(websocket, token, db)
    if not user:
        return
        
    room_name = f"notifications_{user.id}"
    await manager.connect(websocket, org_id, room_name)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id, room_name)
