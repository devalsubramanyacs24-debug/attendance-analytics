import os

from fastapi.testclient import TestClient

from backend import main
from backend.auth import create_access_token


def make_token(role="SUPER_ADMIN"):
    return create_access_token({
        "user_id": 1,
        "employee_id": 1,
        "role": role,
    })


def test_upload_requires_authentication():
    client = TestClient(main.app)

    response = client.post(
        "/upload",
        files={
            "file": (
                "attendance.csv",
                b"employee_id,attendance_date,status\n1,2026-09-18,Present",
                "text/csv",
            )
        },
    )

    assert response.status_code == 401


def test_upload_rejects_unauthorized_role():
    client = TestClient(main.app)

    token = make_token("EMPLOYEE")

    response = client.post(
        "/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "file": (
                "attendance.csv",
                b"employee_id,attendance_date,status\n1,2026-09-18,Present",
                "text/csv",
            )
        },
    )

    assert response.status_code == 403


def test_upload_accepts_allowed_role(
    monkeypatch,
    tmp_path,
):
    client = TestClient(main.app)

    monkeypatch.chdir(tmp_path)

    monkeypatch.setattr(
        main,
        "process_attendance_file",
        lambda file_path: object(),
    )

    monkeypatch.setattr(
        main,
        "load_attendance_to_database",
        lambda df: {
            "records_received": 1,
            "inserted": 1,
            "duplicates_skipped": 0,
        },
    )

    monkeypatch.setattr(
        main,
        "log_audit_event",
        lambda **kwargs: None,
    )

    class FakeDashboardManager:
        async def broadcast(self, data):
            pass

    monkeypatch.setattr(
        main,
        "dashboard_manager",
        FakeDashboardManager(),
    )

    token = make_token("SUPER_ADMIN")

    response = client.post(
        "/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "file": (
                "attendance.csv",
                b"test,data",
                "text/csv",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["filename"] == "attendance.csv"
    assert response.json()["records_received"] == 1

    assert os.path.exists(
        tmp_path / "data" / "uploads" / "attendance.csv"
    )


def test_upload_strips_path_from_filename(
    monkeypatch,
    tmp_path,
):
    client = TestClient(main.app)

    monkeypatch.chdir(tmp_path)

    monkeypatch.setattr(
        main,
        "process_attendance_file",
        lambda file_path: object(),
    )

    monkeypatch.setattr(
        main,
        "load_attendance_to_database",
        lambda df: {
            "records_received": 1,
            "inserted": 1,
            "duplicates_skipped": 0,
        },
    )

    monkeypatch.setattr(
        main,
        "log_audit_event",
        lambda **kwargs: None,
    )

    class FakeDashboardManager:
        async def broadcast(self, data):
            pass

    monkeypatch.setattr(
        main,
        "dashboard_manager",
        FakeDashboardManager(),
    )

    token = make_token("HR_MANAGER")

    response = client.post(
        "/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "file": (
                "../../evil.csv",
                b"test,data",
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    # The path component must not be used.
    assert os.path.exists(
        tmp_path / "data" / "uploads" / "evil.csv"
    )

    assert not os.path.exists(
        tmp_path / "evil.csv"
    )

    assert response.json()["filename"] == "../../evil.csv"


def test_upload_rejects_empty_filename(
    monkeypatch,
    tmp_path,
):
    client = TestClient(main.app)

    monkeypatch.chdir(tmp_path)

    token = make_token("DATA_ANALYST")

    response = client.post(
        "/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "file": (
                "",
                b"test,data",
                "text/csv",
            )
        },
    )

    assert response.status_code in (400, 422)