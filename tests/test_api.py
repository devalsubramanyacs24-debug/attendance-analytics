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

def test_daily_report_requires_authentication(client):
    response = client.get("/api/reports/daily")
    assert response.status_code == 401


def test_weekly_report_requires_authentication(client):
    response = client.get("/api/reports/weekly")
    assert response.status_code == 401


def test_monthly_report_requires_authentication(client):
    response = client.get("/api/reports/monthly")
    assert response.status_code == 401


def test_custom_report_requires_authentication(client):
    response = client.get("/api/reports/custom")
    assert response.status_code == 401

def test_ai_insights_requires_authentication(client):
    response = client.get("/api/ai/insights")
    assert response.status_code == 401


def test_ai_generate_requires_authentication(client):
    response = client.post("/api/ai/generate")
    assert response.status_code == 401


def test_ai_recommendations_requires_authentication(client):
    response = client.get("/api/ai/recommendations")
    assert response.status_code == 401


def test_ai_pdf_export_requires_authentication(client):
    response = client.get("/api/ai/export/pdf")
    assert response.status_code == 401

def test_anomalies_requires_authentication(client):
    response = client.get("/analytics/anomalies")
    assert response.status_code == 401

def test_employee_cannot_access_employee_risk(client):
    token = make_token("EMPLOYEE")

    response = client.get(
        "/analytics/employee-risk",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403


def test_employee_cannot_access_anomalies(client):
    token = make_token("EMPLOYEE")

    response = client.get(
        "/analytics/anomalies",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403

# =========================================================
# ADDITIONAL SRS REPORT TESTS
# =========================================================

def test_department_report_returns_department_records(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "department_analytics",
        lambda **kwargs: [
            {
                "department_name": "Engineering",
                "total_records": 20,
                "present_count": 18,
                "absent_count": 2,
                "late_count": 3,
                "attendance_rate": 90.0,
            }
        ],
    )

    token = make_token("SUPER_ADMIN")

    response = client.get(
        "/api/reports/department",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "department"
    assert data["total_records"] == 1
    assert data["records"][0]["department_name"] == "Engineering"


def test_employee_report_returns_employee_records(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "employee_analytics",
        lambda **kwargs: [
            {
                "employee_code": "E001",
                "employee_name": "Test Employee",
                "department_name": "Engineering",
                "attendance_rate": 95.0,
                "risk_level": "Low",
            }
        ],
    )

    token = make_token("DATA_ANALYST")

    response = client.get(
        "/api/reports/employee",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "employee"
    assert data["total_records"] == 1
    assert data["records"][0]["employee_code"] == "E001"


def test_leave_report_returns_leave_records(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "leave_analytics",
        lambda **kwargs: [
            {
                "employee_name": "Test Employee",
                "leave_type": "Casual Leave",
                "status": "Approved",
            }
        ],
    )

    token = make_token("HR_MANAGER")

    response = client.get(
        "/api/reports/leave",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "leave"
    assert data["total_records"] == 1


def test_late_login_report_filters_late_records(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "attendance_report",
        lambda **kwargs: {
            "records": [
                {
                    "employee_code": "E001",
                    "employee_name": "Employee One",
                    "late_minutes": 15,
                },
                {
                    "employee_code": "E002",
                    "employee_name": "Employee Two",
                    "late_minutes": 0,
                },
            ]
        },
    )

    token = make_token("HR_MANAGER")

    response = client.get(
        "/api/reports/late-login",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "late_login"
    assert data["total_records"] == 1
    assert data["records"][0]["employee_code"] == "E001"


def test_overtime_report_returns_overtime_records(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "overtime_analytics",
        lambda **kwargs: [
            {
                "employee_name": "Test Employee",
                "total_overtime_hours": 5.5,
            }
        ],
    )

    token = make_token("DATA_ANALYST")

    response = client.get(
        "/api/reports/overtime",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "overtime"
    assert data["total_records"] == 1


def test_workforce_utilization_report_returns_summary(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "attendance_summary",
        lambda **kwargs: {
            "total_employees": 10,
            "attendance_rate": 90.0,
            "workforce_utilization": 85.0,
        },
    )

    token = make_token("EXECUTIVE")

    response = client.get(
        "/api/reports/workforce-utilization",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "workforce_utilization"
    assert data["data"]["workforce_utilization"] == 85.0


def test_risk_report_returns_risk_records(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "employee_risk",
        lambda **kwargs: [
            {
                "employee_code": "E001",
                "attendance_rate": 55.0,
                "risk_level": "High",
            }
        ],
    )

    token = make_token("DATA_ANALYST")

    response = client.get(
        "/api/reports/risk",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "risk_assessment"
    assert data["total_records"] == 1
    assert data["records"][0]["risk_level"] == "High"


def test_executive_summary_returns_combined_analytics(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        main,
        "attendance_summary",
        lambda **kwargs: {
            "total_employees": 10,
            "attendance_rate": 90.0,
        },
    )

    monkeypatch.setattr(
        main,
        "department_analytics",
        lambda **kwargs: [
            {
                "department_name": "Engineering",
                "attendance_rate": 90.0,
            }
        ],
    )

    monkeypatch.setattr(
        main,
        "employee_risk",
        lambda **kwargs: [
            {
                "employee_code": "E001",
                "risk_level": "Low",
            }
        ],
    )

    token = make_token("EXECUTIVE")

    response = client.get(
        "/api/reports/executive-summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["report_type"] == "executive_summary"
    assert data["summary"]["attendance_rate"] == 90.0
    assert len(data["department_analysis"]) == 1
    assert len(data["risk_analysis"]) == 1


def test_additional_reports_require_authentication(client):
    routes = [
        "/api/reports/department",
        "/api/reports/employee",
        "/api/reports/leave",
        "/api/reports/late-login",
        "/api/reports/overtime",
        "/api/reports/workforce-utilization",
        "/api/reports/risk",
        "/api/reports/executive-summary",
    ]

    for route in routes:
        response = client.get(route)

        assert response.status_code == 401, route


def test_executive_summary_rejects_employee_role(client):
    token = make_token("EMPLOYEE")

    response = client.get(
        "/api/reports/executive-summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
