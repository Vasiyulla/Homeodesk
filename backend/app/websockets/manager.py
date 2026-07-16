import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Dictionary structure:
        # {
        #    "org_id": {
        #       "room_name": [WebSocket, WebSocket, ...]
        #    }
        # }
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}

    async def connect(self, websocket: WebSocket, org_id: str, room: str):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = {}
        if room not in self.active_connections[org_id]:
            self.active_connections[org_id][room] = []
        
        self.active_connections[org_id][room].append(websocket)
        logger.info(f"Client connected to org {org_id} room {room}")

    def disconnect(self, websocket: WebSocket, org_id: str, room: str):
        if org_id in self.active_connections and room in self.active_connections[org_id]:
            try:
                self.active_connections[org_id][room].remove(websocket)
                logger.info(f"Client disconnected from org {org_id} room {room}")
            except ValueError:
                pass

    async def broadcast(self, org_id: str, room: str, message: dict):
        if org_id in self.active_connections and room in self.active_connections[org_id]:
            connections = self.active_connections[org_id][room]
            logger.info(f"Broadcasting to {len(connections)} clients in org {org_id} room {room}")
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to client: {e}")
                    self.disconnect(connection, org_id, room)

manager = ConnectionManager()
