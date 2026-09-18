from fastapi.testclient import TestClient

from backend import main
from backend.auth import create_access_token


class FakeRow(dict):
    @property
    def _mapping(self):
        return self


class FakeResult:
    def __init__(self, rows=None):
        self.rows = [FakeRow(row) for row in (rows or [])]

    def mappings(self):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None

    def __iter__(self):
        return iter(self.rows)


class FakeConnection:
    def __init__(self, rows=None):
        self.result = FakeResult(rows)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, *args, **kwargs):
        return self.result


class FakeEngine:
    def __init__(self, rows=None):
        self.rows = rows or []

    def connect(self):
        return FakeConnection(self.rows)


def make_token(role, employee_id=1):
    return create_access_token({
        "user_id": 1,
        "employee_id": employee_id,
        "role": role,
    })


def test_employee_profile_requires_authentication():
    client = TestClient(main.app)

    response = client.get("/api/employee/profile")

    assert response.status_code == 401


def test_employee_attendance_requires_employee_role():
    client = TestClient(main.app)

    token = make_token("HR_MANAGER")

    response = client.get(
        "/api/employee/attendance",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_employee_attendance_accepts_employee_role(
    monkeypatch,
):
    client = TestClient(main.app)

    rows = [
        {
            "employee_code": "EMP001",
            "employee_name": "Test Employee",
            "attendance_date": "2026-09-18",
            "status": "Present",
            "login_time": "09:00:00",
            "logout_time": "18:00:00",
            "working_hours": 9.0,
            "overtime_hours": 1.0,
            "late_minutes": 0,
        }
    ]

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(rows),
    )

    token = make_token("EMPLOYEE", employee_id=1)

    response = client.get(
        "/api/employee/attendance",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_employees_endpoint_requires_allowed_role():
    client = TestClient(main.app)

    token = make_token("EMPLOYEE")

    response = client.get(
        "/employees",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_employees_endpoint_accepts_hr_manager(
    monkeypatch,
):
    client = TestClient(main.app)

    rows = [
        {
            "employee_id": 1,
            "employee_code": "EMP001",
            "employee_name": "Test Employee",
            "email": "test@example.com",
            "department_id": 1,
            "department_name": "Engineering",
            "designation": "Developer",
            "joining_date": "2026-01-01",
            "status": "Active",
        }
    ]

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(rows),
    )

    token = make_token("HR_MANAGER")

    response = client.get(
        "/employees",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_departments_endpoint_requires_authentication():
    client = TestClient(main.app)

    response = client.get("/departments")

    assert response.status_code == 401


def test_departments_endpoint_accepts_data_analyst(
    monkeypatch,
):
    client = TestClient(main.app)

    rows = [
        {
            "department_id": 1,
            "department_name": "Engineering",
        }
    ]

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(rows),
    )

    token = make_token("DATA_ANALYST")

    response = client.get(
        "/departments",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_leaves_endpoint_requires_authentication():
    client = TestClient(main.app)

    response = client.get("/leaves")

    assert response.status_code == 401


def test_leaves_endpoint_accepts_authenticated_employee(
    monkeypatch,
):
    client = TestClient(main.app)

    rows = [
        {
            "leave_id": 1,
            "employee_code": "EMP001",
            "employee_name": "Test Employee",
            "leave_date": "2026-09-20",
            "leave_type": "Casual",
            "status": "Pending",
            "reason": "Personal",
        }
    ]

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(rows),
    )

    token = make_token("EMPLOYEE", employee_id=1)

    response = client.get(
        "/leaves",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200