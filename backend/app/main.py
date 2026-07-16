"""
Homeopathy Backend — Application Entry Point

Production-ready FastAPI application with:
- CORS middleware for frontend integration
- Structured logging
- Startup/shutdown lifecycle hooks
- All API routers registered
- PostgreSQL database backend
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

from .api import (
    auth, health, ingest, search, cases,
    symptom_search, pharmacy,
    staff, patients, appointments, doses, departments, billing, organization,
    analytics, audit_logs, notifications, repertory,
)
from .websockets import routes as ws_routes
from .middleware.audit import AuditLogMiddleware
from .core.config import settings
from .db.database import engine

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifecycle ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown hooks."""
    # Startup
    logger.info("Starting Homeopathy Backend...")
    logger.info(f"Environment: {settings.ENV}")
    logger.info("Database initialized")
    from .db.database import Base
    Base.metadata.create_all(bind=engine)

    yield

    # Shutdown
    logger.info("Shutting down Homeopathy Backend...")
    engine.dispose()
    logger.info("Database connections closed")


# ── App Instance ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Homeopathy Case Management API",
    description="Backend API for managing homeopathy clinics and patient cases.",
    version="1.0.0",
    lifespan=lifespan,
)

# Attach Rate Limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(SlowAPIMiddleware)
app.add_middleware(AuditLogMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register Routers ────────────────────────────────────────────────────────

import sys
import os

app.include_router(health.router, prefix="/health", tags=["Health"])



app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(ingest.router, prefix="/ingest", tags=["Data Ingestion"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(symptom_search.router, prefix="/api", tags=["Symptom Search"])
app.include_router(cases.router, prefix="/api", tags=["Cases"])
app.include_router(staff.router, prefix="/api", tags=["Staff"])
app.include_router(patients.router, prefix="/api", tags=["Patients"])

app.include_router(appointments.router, prefix="/api", tags=["Appointments"])
app.include_router(doses.router, prefix="/api", tags=["Doses"])
app.include_router(departments.router, prefix="/api", tags=["Departments"])
app.include_router(billing.router, prefix="/api", tags=["Billing"])
app.include_router(organization.router, prefix="/api", tags=["Organization"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(audit_logs.router, prefix="/api", tags=["Audit Logs"])
app.include_router(pharmacy.router, prefix="/api", tags=["Pharmacy"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(repertory.router, prefix="/api/repertory", tags=["Repertory"])
app.include_router(ws_routes.router, tags=["WebSockets"])


# ── Root ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "homeopathy-backend",
        "version": "0.3.0",
        "status": "running",
        "environment": settings.ENV,
    }
