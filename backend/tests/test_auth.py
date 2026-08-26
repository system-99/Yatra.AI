from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_is_public():
    response = client.get("/health")
    assert response.status_code == 200


def test_protected_endpoint_requires_supabase_bearer_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
