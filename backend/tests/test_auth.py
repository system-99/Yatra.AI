from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_register_and_login_success():
    register_payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "Password123!",
    }

    register_response = client.post("/api/auth/register", json=register_payload)
    assert register_response.status_code == 200, register_response.text
    body = register_response.json()
    assert body["user"]["email"] == "test@example.com"
    assert "token" in body

    login_response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "Password123!"},
    )
    assert login_response.status_code == 200, login_response.text
    login_body = login_response.json()
    assert login_body["user"]["email"] == "test@example.com"
    assert "token" in login_body


def test_login_rejects_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401, response.text
