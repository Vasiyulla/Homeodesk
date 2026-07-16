import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.database import SessionLocal
from app.db.models import AuditLog
from app.core.security import decode_access_token

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # We only care about mutating requests
        if request.method not in ["POST", "PUT", "PATCH", "DELETE"]:
            return await call_next(request)

        # Skip auth and docs routes
        if request.url.path.startswith("/api/auth") or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)

        # Get payload if possible
        payload = None
        try:
            body = await request.body()
            if body:
                payload = json.loads(body)
        except Exception:
            pass

        # Call next to get the response, we might want to log only successful ones or log the status code
        response = await call_next(request)

        if response.status_code >= 400:
             return response # Don't log failed mutating operations or maybe log them with status 'failed'? Let's keep it simple.

        # Identify actor
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                decoded = decode_access_token(token)
                user_id = decoded.get("sub")
            except Exception:
                pass

        # Identify resource_type based on URL
        path = request.url.path
        resource_type = "Unknown"
        if "/cases" in path:
            resource_type = "Case"
        elif "/appointments" in path:
            resource_type = "Appointment"
        elif "/doses" in path:
            resource_type = "DoseAdministrationLog"
        elif "/staff" in path:
            resource_type = "User"
        elif "/departments" in path:
            resource_type = "Department"
        elif "/billing" in path:
            resource_type = "Invoice"

        # Log to DB asynchronously or synchronously
        db = SessionLocal()
        try:
            import uuid
            from app.db.models import OrganizationUser
            uid = uuid.UUID(user_id) if user_id else None
            
            # Resolve organization_id from the user
            org_id = None
            if uid:
                org_user = db.query(OrganizationUser).filter(
                    OrganizationUser.user_id == uid
                ).first()
                if org_user:
                    org_id = org_user.organization_id

            audit_log = AuditLog(
                organization_id=org_id,
                actor_id=uid,
                action=request.method,
                resource_type=resource_type,
                resource_id=path,
                payload_json=payload,
                ip_address=request.client.host if request.client else None
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            print(f"Failed to log audit event: {e}")
        finally:
            db.close()

        return response
