# Pytest configuration
import sys
import pytest
from pathlib import Path
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from app.main import app
from app.db.database import Base, get_db
from app.core.config import settings

# For tests, we append _test to the database name
test_db_url = settings.DATABASE_URL
if not test_db_url.endswith("_test"):
    test_db_url = f"{test_db_url}_test"

# Use NullPool for tests to avoid lingering connections
engine = create_engine(test_db_url, poolclass=None)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in test database once per session."""
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after tests complete
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator:
    """Provide a transactional scope for each test."""
    # Create a new connection and begin a transaction
    connection = engine.connect()
    transaction = connection.begin()
    
    # Bind an individual session to the connection
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    # Rollback everything when test finishes to keep DB clean
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session) -> Generator:
    """Provide a TestClient that uses our isolated db_session."""
    def override_get_db():
        yield db_session
        
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
