"""
Database Initialization Script

Verifies database connection, runs Alembic migrations, and optionally seeds initial data.
Safe to run multiple times.

Usage:
    python scripts/init_db.py                # Verify connection and run migrations
    python scripts/init_db.py --seed         # Run migrations + seed demo data
    python scripts/init_db.py --reset        # Drop all tables and recreate
"""
import sys
import argparse
import logging
import subprocess
from pathlib import Path
from sqlalchemy import text

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.db.models import User, Case, Decision, FollowUp, Repertory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("init_db")


def check_connection():
    """Verify PostgreSQL connection."""
    logger.info(f"Checking database connection: {settings.DATABASE_URL.split('@')[-1]}")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("PostgreSQL connection successful.")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        logger.error("Please ensure PostgreSQL is running and credentials are correct.")
        sys.exit(1)


def run_migrations():
    """Run Alembic migrations."""
    logger.info("Running database migrations...")
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True, cwd=str(backend_path))
        logger.info("Migrations completed successfully.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


def drop_tables():
    """Drop all database tables (DESTRUCTIVE!)."""
    logger.warning("Dropping ALL tables...")
    Base.metadata.drop_all(bind=engine)
    logger.info("All tables dropped.")
    # Also drop alembic_version table
    try:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    except Exception:
        pass


def seed_demo_data():
    """Seed the database with a demo practitioner account."""
    db = SessionLocal()
    try:
        # Check if demo user already exists
        existing = db.query(User).filter(User.email == "demo@homeopathy.dev").first()
        if existing:
            logger.info(f"Demo user already exists (id={existing.id})")
            return existing.id

        # Create demo practitioner
        demo_user = User(
            email="demo@homeopathy.dev",
            full_name="Dr. Demo Practitioner",
            license_number="DEMO-001",
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        logger.info(f"Created demo practitioner: {demo_user.full_name} (id={demo_user.id})")

        # Create a sample case
        sample_case = Case(
            practitioner_id=demo_user.id,
            patient_name="Sample Patient",
            patient_age=35,
            patient_gender="Female",
            chief_complaint="Anxiety with palpitations, worse in evening",
            case_notes="Patient reports chronic anxiety for 6 months. Symptoms worse in evening and from stress. Desire for open air. Chilly patient.",
            symptoms=[
                {"text": "Anxiety", "category": "Mental", "intensity": 3, "modalities": ["worse evening", "worse stress"]},
                {"text": "Palpitations", "category": "Particular", "intensity": 2, "modalities": ["worse lying down"]},
                {"text": "Desire for open air", "category": "General", "intensity": 1, "modalities": []},
                {"text": "Chilly", "category": "General", "intensity": 2, "modalities": ["worse cold weather"]},
            ],
            mode="clinical",
        )
        db.add(sample_case)
        db.commit()
        db.refresh(sample_case)
        logger.info(f"Created sample case: {sample_case.chief_complaint} (id={sample_case.id})")

        # Create a sample decision
        sample_decision = Decision(
            case_id=sample_case.id,
            remedy_name="Pulsatilla",
            potency="200C",
            dose="Single dose",
            reasoning="Strong mental symptoms with desire for open air. Chilly but desires open air is a keynote of Pulsatilla. Anxiety worse in evening matches.",
            rejected_remedies=["Arsenicum", "Phosphorus"],
            supporting_rubrics=["Mind/ANXIETY/evening", "Generalities/AIR open/desire for"],
            confidence="high",
        )
        db.add(sample_decision)
        db.commit()
        logger.info(f"Created sample decision: {sample_decision.remedy_name} {sample_decision.potency}")

        # Create a sample follow-up
        sample_followup = FollowUp(
            case_id=sample_case.id,
            decision_id=sample_decision.id,
            days_since_dose=7,
            reaction="amelioration",
            observations="Patient reports reduced anxiety. Palpitations less frequent. Still slightly chilly.",
            new_symptoms=None,
            notes="Good initial response. Continue to observe. No repetition needed yet.",
        )
        db.add(sample_followup)
        db.commit()
        logger.info("Created sample follow-up observation")

        return demo_user.id

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


def verify_tables():
    """Verify all expected tables exist and report row counts."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    expected = {"users", "cases", "decisions", "follow_ups", "repertory"}
    missing = expected - set(tables)

    if missing:
        logger.warning(f"Missing tables: {', '.join(missing)}")
    else:
        logger.info("All expected tables present ✓")

    # Report row counts
    db = SessionLocal()
    try:
        for table in sorted(tables):
            if table == "alembic_version":
                continue
            count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            logger.info(f"  {table}: {count} rows")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Initialize the Homeopathy database")
    parser.add_argument("--seed", action="store_true", help="Seed demo data after running migrations")
    parser.add_argument("--reset", action="store_true", help="Drop all tables and recreate (DESTRUCTIVE)")
    args = parser.parse_args()

    print()
    print("=" * 50)
    print("  Homeopathy Backend — Database Initializer")
    print("=" * 50)
    print()

    check_connection()

    if args.reset:
        confirm = input("⚠️  This will DELETE all data. Type 'yes' to confirm: ")
        if confirm.lower() != "yes":
            print("Cancelled.")
            return
        drop_tables()

    run_migrations()

    if args.seed:
        seed_demo_data()

    print()
    verify_tables()

    print()
    print("✓ Database initialization complete!")
    print()


if __name__ == "__main__":
    main()
