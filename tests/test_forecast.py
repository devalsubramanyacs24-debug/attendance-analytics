from backend import main


class FakeRow:
    def __init__(self, data):
        self._mapping = data


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def __iter__(self):
        return iter(self.rows)


class FakeConnection:
    def __init__(self):
        self.queries = []

    def execute(self, query, params=None):
        sql = str(query)
        self.queries.append(sql)

        return FakeResult([
            FakeRow({
                "attendance_date": "2026-09-01",
                "total_records": 2,
                "present_count": 1,
            }),
            FakeRow({
                "attendance_date": "2026-09-02",
                "total_records": 2,
                "present_count": 2,
            }),
        ])


class FakeEngine:
    def __init__(self, connection):
        self.connection = connection

    def connect(self):
        return self

    def __enter__(self):
        return self.connection

    def __exit__(self, exc_type, exc, tb):
        pass


def test_forecast_uses_working_day_denominator(monkeypatch):
    connection = FakeConnection()

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    main.attendance_forecast(
        current_user={
            "user_id": 1,
            "employee_id": 1,
            "role": "SUPER_ADMIN",
        }
    )

    assert len(connection.queries) == 1

    historical_query = connection.queries[0]

    assert "a.status IN ('Present', 'Absent', 'Half Day', 'Late')" in historical_query