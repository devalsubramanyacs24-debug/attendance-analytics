from backend import main


class FakeRow:
    def __init__(self, data):
        self._mapping = data

    def __getitem__(self, key):
        return self._mapping[key]

    def __iter__(self):
        return iter(self._mapping.items())


class FakeResult:
    def __init__(self, rows=None, scalar_value=None):
        self.rows = rows or []
        self.scalar_value = scalar_value

    def mappings(self):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def all(self):
        return self.rows

    def scalar(self):
        return self.scalar_value


class FakeConnection:
    def __init__(self):
        self.queries = []

    def execute(self, query, params=None):
        sql = str(query)
        self.queries.append(sql)

        if "COUNT(*) AS total_records" in sql:
            return FakeResult(
                rows=[
                    FakeRow({
                        "total_records": 5,
                        "present_count": 3,
                        "absent_count": 1,
                        "late_count": 1,
                        "average_working_hours": 7.5,
                        "total_overtime_hours": 2.0,
                    })
                ]
            )

        if "SELECT COUNT(*)" in sql:
            return FakeResult(scalar_value=5)

        if "GROUP BY d.department_id" in sql:
            return FakeResult(
                rows=[
                    FakeRow({
                        "department_name": "IT",
                        "total_records": 4,
                        "present_count": 3,
                        "absent_count": 1,
                        "late_count": 1,
                        "attendance_rate": 75.0,
                        "absenteeism_rate": 25.0,
                        "late_arrival_rate": 25.0,
                        "average_working_hours": 7.5,
                        "total_overtime_hours": 2.0,
                    })
                ]
            )

        if "GROUP BY DATE_FORMAT" in sql:
            return FakeResult()

        if "GROUP BY d.department_id" in sql:
            return FakeResult()

        return FakeResult()


class FakeEngine:
    def __init__(self, connection):
        self.connection = connection

    def connect(self):
        return self

    def __enter__(self):
        return self.connection

    def __exit__(self, exc_type, exc, tb):
        pass


def test_ai_department_metrics_use_working_day_denominator(monkeypatch):
    connection = FakeConnection()
    monkeypatch.setattr(main, "engine", FakeEngine(connection))

    main._collect_ai_metrics()

    department_query = next(
        query
        for query in connection.queries
        if "GROUP BY d.department_id" in query
        and "attendance_rate" in query
    )

    assert "status IN ('Present', 'Absent', 'Half Day', 'Late')" in department_query


def test_ai_department_late_rate_uses_late_minutes(monkeypatch):
    connection = FakeConnection()
    monkeypatch.setattr(main, "engine", FakeEngine(connection))

    main._collect_ai_metrics()

    department_query = next(
        query
        for query in connection.queries
        if "GROUP BY d.department_id" in query
        and "attendance_rate" in query
    )

    assert "COALESCE(a.late_minutes, 0) > 0" in department_query