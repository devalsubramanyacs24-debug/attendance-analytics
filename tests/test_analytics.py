from backend import main


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
    def __init__(self, results):
        self.results = results
        self.call_index = 0

    def execute(self, query, params=None):
        if self.call_index >= len(self.results):
            raise AssertionError(
                f"Unexpected database query:\n{query}"
            )

        result = self.results[self.call_index]
        self.call_index += 1
        return result

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass


class FakeEngine:
    def __init__(self, connection):
        self.connection = connection

    def connect(self):
        return self.connection


def test_department_analytics_returns_department_data(monkeypatch):
    rows = [
        {
            "department_id": 1,
            "department_name": "HR",
            "total_employees": 2,
            "attendance_records": 4,
            "present": 2,
            "absent": 1,
            "late": 1,
            "attendance_rate": 50.0,
            "absenteeism_rate": 25.0,
            "late_arrival_rate": 25.0,
            "average_working_hours": 8.0,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.department_analytics(
        current_user=user
    )

    assert isinstance(result, list)
    assert result[0]["department_name"] == "HR"
    assert result[0]["attendance_rate"] == 50.0


def test_leave_analytics_returns_leave_data(monkeypatch):
    rows = [
        {
            "department_name": "HR",
            "total_leaves": 3,
            "total_days": 5,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.leave_analytics(
        current_user=user
    )

    assert isinstance(result, list)
    assert result[0]["department_name"] == "HR"


def test_overtime_analytics_returns_employee_overtime(monkeypatch):
    rows = [
        {
            "employee_code": "E001",
            "employee_name": "Rahul",
            "department_name": "HR",
            "total_overtime_hours": 4.0,
            "average_overtime_hours": 2.0,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.overtime_analytics(
        current_user=user
    )

    assert isinstance(result, list)
    assert result[0]["employee_code"] == "E001"
    assert result[0]["total_overtime_hours"] == 4.0


def test_employee_analytics_returns_employee_data(monkeypatch):
    rows = [
        {
            "employee_id": 1,
            "employee_code": "E001",
            "employee_name": "Rahul",
            "department_name": "HR",
            "total_records": 10,
            "present_count": 9,
            "absent_count": 1,
            "late_count": 1,
            "attendance_rate": 90.0,
            "average_working_hours": 8.5,
            "total_overtime_hours": 3.0,
            "total_late_minutes": 15,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.employee_analytics(
        current_user=user
    )

    assert isinstance(result, list)
    assert result[0]["employee_code"] == "E001"
    assert result[0]["attendance_rate"] == 90.0


def test_leave_analytics_accepts_date_and_department_filters(
    monkeypatch
):
    rows = [
        {
            "department_name": "IT",
            "total_leaves": 2,
            "total_days": 3,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.leave_analytics(
        start_date="2026-09-01",
        end_date="2026-09-30",
        department="IT",
        current_user=user,
    )

    assert result[0]["department_name"] == "IT"


def test_overtime_analytics_accepts_date_and_department_filters(
    monkeypatch
):
    rows = [
        {
            "employee_code": "E003",
            "employee_name": "Arjun",
            "department_name": "IT",
            "total_overtime_hours": 5.0,
            "average_overtime_hours": 2.5,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.overtime_analytics(
        start_date="2026-09-01",
        end_date="2026-09-30",
        department="IT",
        current_user=user,
    )

    assert result[0]["department_name"] == "IT"


def test_employee_analytics_accepts_date_and_department_filters(
    monkeypatch
):
    rows = [
        {
            "employee_id": 3,
            "employee_code": "E003",
            "employee_name": "Arjun",
            "department_name": "IT",
            "total_records": 20,
            "present_count": 17,
            "absent_count": 3,
            "late_count": 1,
            "attendance_rate": 85.0,
            "average_working_hours": 8.0,
            "total_overtime_hours": 2.0,
            "total_late_minutes": 10,
        }
    ]

    connection = FakeConnection([
        FakeResult(rows=rows)
    ])

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    user = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.employee_analytics(
        start_date="2026-09-01",
        end_date="2026-09-30",
        department="IT",
        current_user=user,
    )

    assert isinstance(result, list)
    assert result[0]["department_name"] == "IT"
    assert result[0]["employee_code"] == "E003"
    assert result[0]["attendance_rate"] == 85.0