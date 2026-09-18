from backend import main


class FakeRow:
    def __init__(self, data):
        self._mapping = data


class FakeResult:
    def __init__(self, rows=None):
        self.rows = rows or []

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
                "employee_code": "EMP001",
                "employee_name": "Test Employee",
                "department_name": "IT",
                "total_overtime_hours": 2.0,
                "average_overtime_hours": 1.0,
            })
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


def test_overtime_excludes_non_working_days(monkeypatch):
    connection = FakeConnection()

    monkeypatch.setattr(
        main,
        "engine",
        FakeEngine(connection)
    )

    main.overtime_analytics(
        current_user={
            "user_id": 1,
            "employee_id": 1,
            "role": "SUPER_ADMIN",
        }
    )

    assert len(connection.queries) == 1

    overtime_query = connection.queries[0]

    assert "a.status IN ('Present', 'Absent', 'Half Day', 'Late')" in overtime_query