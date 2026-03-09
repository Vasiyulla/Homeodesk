"""
Integration tests for API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def test_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert "service" in response.json()
    
    def test_health(self, client):
        response = client.get("/health/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestSearchEndpoints:
    """Test search API endpoints."""
    
    def test_sections(self, client):
        response = client.get("/search/sections")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert isinstance(data["sections"], list)
    
    def test_stats(self, client):
        response = client.get("/search/stats")
        assert response.status_code == 200
        data = response.json()
        # Expect at least boger or kent
        assert len(data) > 0
    
    def test_search_rubrics(self, client):
        response = client.get("/search/search?q=anxiety")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "count" in data
        assert data["count"] >= 0


# RAG endpoints have been removed from the API; previous tests were deprecated.