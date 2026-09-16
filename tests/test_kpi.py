from backend import main


class FakeResult:
    def __init__(self, scalar_value=None, mapping_value=None):
        self.scalar_value = scalar_value
        self.mapping_value = mapping_value

    def scalar(self):
        return self.scalar_value

    def mappings(self):
        return self

    def first(self):
        return self.mapping_value


class FakeDB:
    def __init__(self):
        self.call_count = 0

    def execute(self, query, params=None):
        self.call_count += 1
        sql = str(query)

        # 1. Total employees
        if "SELECT COUNT(*)" in sql and "FROM employees" in sql:
            return FakeResult(scalar_value=2)

        # 2. Main attendance KPI query
        if "COUNT(*) AS attendance_records" in sql:
            return FakeResult(
                mapping_value={
                    "attendance_records": 4,
                    "present_count": 2,
                    "absent_count": 1,
                    "late_count": 1,
                    "working_day_records": 4,
                    "avg_working_hours": 8.0,
                    "actual_working_hours": 32.0,
                    "total_overtime": 2.5,
                }
            )

        # 3. Dropout employees
        if "low_attendance_employees" in sql:
            return FakeResult(scalar_value=1)

        # 4. Active employees
        if "status = 'Active'" in sql:
            return FakeResult(scalar_value=2)

        raise AssertionError(
            f"Unexpected database query in KPI test:\n{sql}"
        )

    def close(self):
        pass


def test_attendance_summary_kpis(monkeypatch):
    """
    Verify the actual /analytics/summary implementation
    calculates the core KPI percentages correctly.
    """

    fake_db = FakeDB()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: fake_db,
    )

    current_user = {
        "user_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.attendance_summary(
        current_user=current_user
    )

    # Basic counts
    assert result["total_employees"] == 2
    assert result["attendance_records"] == 4
    assert result["present"] == 2
    assert result["absent"] == 1
    assert result["late"] == 1

    # Attendance = Present / Working-day records
    # = 2 / 4 * 100 = 50%
    assert result["attendance_rate"] == 50.0

    # Absenteeism = Absent / Working-day records
    # = 1 / 4 * 100 = 25%
    assert result["absenteeism_rate"] == 25.0

    # Late arrival = Late / Working-day records
    # = 1 / 4 * 100 = 25%
    assert result["late_arrival_rate"] == 25.0


def test_attendance_summary_working_hours_and_overtime(monkeypatch):
    """
    Verify working-hours and overtime values returned by
    the real analytics summary function.
    """

    fake_db = FakeDB()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: fake_db,
    )

    current_user = {
        "user_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.attendance_summary(
        current_user=current_user
    )

    assert result["average_working_hours"] == 8.0
    assert result["total_overtime_hours"] == 2.5


def test_attendance_summary_srs_kpis(monkeypatch):
    """
    Verify the additional SRS KPI calculations.
    """

    fake_db = FakeDB()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: fake_db,
    )

    current_user = {
        "user_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.attendance_summary(
        current_user=current_user
    )

    # Available hours = working-day records * 8
    # = 4 * 8 = 32
    #
    # Workforce utilization =
    # actual working hours / available hours * 100
    # = 32 / 32 * 100 = 100%
    assert result["workforce_utilization"] == 100.0

    # 1 employee below 70% attendance out of 2
    assert result["dropout_rate"] == 50.0

    # 2 active employees out of 2
    assert result["employee_retention_score"] == 100.0


def test_attendance_summary_zero_working_days(monkeypatch):
    """
    Verify KPI calculations safely return 0 when there are
    no working-day attendance records.
    """

    class ZeroWorkingDayDB:
        def execute(self, query, params=None):
            sql = str(query)

            if "SELECT COUNT(*)" in sql and "FROM employees" in sql:
                return FakeResult(scalar_value=0)

            if "COUNT(*) AS attendance_records" in sql:
                return FakeResult(
                    mapping_value={
                        "attendance_records": 0,
                        "present_count": 0,
                        "absent_count": 0,
                        "late_count": 0,
                        "working_day_records": 0,
                        "avg_working_hours": 0,
                        "actual_working_hours": 0,
                        "total_overtime": 0,
                    }
                )

            if "low_attendance_employees" in sql:
                return FakeResult(scalar_value=0)

            if "status = 'Active'" in sql:
                return FakeResult(scalar_value=0)

            raise AssertionError(
                f"Unexpected database query:\n{sql}"
            )

        def close(self):
            pass

    fake_db = ZeroWorkingDayDB()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: fake_db,
    )

    current_user = {
        "user_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = main.attendance_summary(
        current_user=current_user
    )

    assert result["attendance_rate"] == 0
    assert result["absenteeism_rate"] == 0
    assert result["late_arrival_rate"] == 0
    assert result["workforce_utilization"] == 0