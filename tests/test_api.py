import pytest
from fastapi.testclient import TestClient

from backend import main
from backend.auth import create_access_token


class FakeRow(dict):
    @property
    def _mapping(self):
        return self


class FakeResult:
    def __init__(self, rows=None, scalar_value=None):
        self.rows = [FakeRow(row) for row in (rows or [])]
        self.scalar_value = scalar_value

    def mappings(self):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None

    def scalar(self):
        return self.scalar_value

    def __iter__(self):
        return iter(self.rows)


class FakeConnection:
    def __init__(self, results=None):
        self.results = results or []
        self.index = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, *args, **kwargs):
        if self.index < len(self.results):
            result = self.results[self.index]
            self.index += 1
            return result

        return FakeResult()


class FakeEngine:
    def __init__(self, results=None):
        self.results = results or []

    def connect(self):
        return FakeConnection(self.results)


def make_token(role="SUPER_ADMIN", employee_id=1):
    return create_access_token({
        "user_id": 1,
        "employee_id": employee_id,
        "role": role,
    })


@pytest.fixture
def client():
    return TestClient(main.app)


def test_root_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200


def test_analytics_summary_requires_authentication(client):
    response = client.get("/analytics/summary")

    assert response.status_code == 401


def test_department_analytics_requires_authentication(client):
    response = client.get("/analytics/departments")

    assert response.status_code == 401


def test_employee_risk_requires_authentication(client):
    response = client.get("/analytics/employee-risk")

    assert response.status_code == 401


def test_department_analytics_accepts_authenticated_user(
    client,
    monkeypatch,
):
    fake_rows = [
        {
            "department_id": 1,
            "department": "Engineering",
            "total_employees": 10,
            "total_records": 20,
            "present": 18,
            "absent": 2,
            "late": 3,
            "attendance_rate": 90.0,
            "absence_rate": 10.0,
            "late_rate": 15.0,
        }
    ]

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine([FakeResult(rows=fake_rows)]),
    )

    token = make_token("SUPER_ADMIN")

    response = client.get(
        "/analytics/departments",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_leave_analytics_accepts_date_filters(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine([FakeResult(rows=[])]),
    )

    token = make_token("HR_MANAGER")

    response = client.get(
        "/analytics/leave",
        params={
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_overtime_analytics_accepts_department_filter(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine([FakeResult(rows=[])]),
    )

    token = make_token("DATA_ANALYST")

    response = client.get(
        "/analytics/overtime",
        params={
            "department": "Engineering",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_employee_risk_rejects_employee_role(
    client,
    monkeypatch,
):
    token = make_token("EMPLOYEE")

    response = client.get(
        "/analytics/employee-risk",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403

def test_login_rejects_invalid_credentials(client, monkeypatch):
    fake_user = {
        "user_id": 1,
        "employee_id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "password_hash": "invalid-hash",
        "role": "EMPLOYEE",
        "is_active": True,
    }

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine([FakeResult(rows=[fake_user])]),
    )

    monkeypatch.setattr(
        main,
        "verify_password",
        lambda password, hashed: False,
    )

    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_auth_me_returns_current_user(client):
    token = make_token(
        role="EMPLOYEE",
        employee_id=25,
    )

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": 1,
        "employee_id": 25,
        "role": "EMPLOYEE",
    }

def test_logout_requires_authentication(client):
    response = client.post("/api/auth/logout")

    assert response.status_code == 401