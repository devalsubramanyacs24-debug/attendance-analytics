from fastapi.testclient import TestClient

from backend import main
from backend.auth import create_access_token


def make_token(role):
    return create_access_token({
        "user_id": 1,
        "employee_id": 1,
        "role": role,
    })


def test_admin_settings_requires_authentication():
    client = TestClient(main.app)

    response = client.get("/api/admin/settings")

    assert response.status_code == 401


def test_admin_settings_rejects_non_super_admin():
    client = TestClient(main.app)

    token = make_token("HR_MANAGER")

    response = client.get(
        "/api/admin/settings",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_admin_kpis_rejects_non_super_admin():
    client = TestClient(main.app)

    token = make_token("DATA_ANALYST")

    response = client.put(
        "/api/admin/kpis",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert response.status_code == 403


def test_business_rules_rejects_non_super_admin():
    client = TestClient(main.app)

    token = make_token("HR_MANAGER")

    response = client.put(
        "/api/admin/business-rules",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert response.status_code == 403


def test_admin_users_requires_super_admin():
    client = TestClient(main.app)

    token = make_token("HR_MANAGER")

    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_admin_user_creation_rejects_non_super_admin():
    client = TestClient(main.app)

    token = make_token("HR_MANAGER")

    response = client.post(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test User",
            "email": "test@example.com",
            "role": "EMPLOYEE",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 403


def test_admin_reset_password_rejects_employee():
    client = TestClient(main.app)

    token = make_token("EMPLOYEE")

    response = client.post(
        "/api/admin/reset-password",
        params={
            "user_id": 2,
            "new_password": "NewPassword123!",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_admin_reset_password_rejects_short_password():
    client = TestClient(main.app)

    token = make_token("HR_MANAGER")

    response = client.post(
        "/api/admin/reset-password",
        params={
            "user_id": 2,
            "new_password": "short",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "New password must be at least 8 characters long"
    )


def test_audit_logs_requires_authentication():
    client = TestClient(main.app)

    response = client.get("/api/audit-logs")

    assert response.status_code == 401


def test_audit_logs_rejects_employee():
    client = TestClient(main.app)

    token = make_token("EMPLOYEE")

    response = client.get(
        "/api/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_audit_logs_rejects_data_analyst():
    client = TestClient(main.app)

    token = make_token("DATA_ANALYST")

    response = client.get(
        "/api/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403

def test_audit_logs_allows_super_admin():
    client = TestClient(main.app)

    token = make_token("SUPER_ADMIN")

    response = client.get(
        "/api/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)