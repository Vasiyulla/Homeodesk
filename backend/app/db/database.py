"""
Database connection and session management.

PostgreSQL-only configuration with QueuePool for production:
- pool_pre_ping: detect stale connections before use
- Configurable pool_size, max_overflow, timeout, recycle via env vars
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# ── Engine Creation ──────────────────────────────────────────────────────────

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_kwargs = {
    "echo": settings.DEBUG,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": settings.DB_POOL_RECYCLE,
    })

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

if is_sqlite:
    logger.info("SQLite engine created")
else:
    logger.info(
        "PostgreSQL engine created — pool_size=%d, max_overflow=%d",
        settings.DB_POOL_SIZE,
        settings.DB_MAX_OVERFLOW,
    )


# ── Session Factory ──────────────────────────────────────────────────────────

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── ORM Base ─────────────────────────────────────────────────────────────────

Base = declarative_base()


# ── Dependency ───────────────────────────────────────────────────────────────

def get_db():
    """FastAPI dependency — yields a DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
