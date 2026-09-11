import os
import pandas as pd
from sqlalchemy import text
from backend.database import engine

REQUIRED_COLUMNS = {
    "employee_id",
    "employee_name",
    "department",
    "date",
    "status",
    "check_in",
    "check_out",
}

STANDARD_START_TIME = "09:30"
GRACE_END_TIME = "09:45"
REGULAR_HOURS = 8.0
OVERTIME_THRESHOLD = 9.0
WEEKLY_HOUR_CAP = 60.0


def read_attendance_file(file_path):
    extension = os.path.splitext(file_path)[1].lower()

    if extension == ".csv":
        df = pd.read_csv(file_path)
    elif extension in {".xlsx", ".xls"}:
        df = pd.read_excel(file_path)
    else:
        raise ValueError(
            "Unsupported file type. Please upload CSV or Excel."
        )

    df = df.dropna(how="all")

    unnamed = [
        c for c in df.columns
        if str(c).lower().startswith("unnamed:")
    ]
    if unnamed:
        df = df.drop(columns=unnamed)

    return df


def validate_columns(df):
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"Missing required columns: {sorted(missing)}"
        )


def validate_employee_ids(df):
    ids = set(df["employee_id"].astype(str).str.strip())

    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT employee_code
                FROM employees
                WHERE status = 'Active'
            """)
        )

        valid_ids = {str(row[0]).strip() for row in rows}

    invalid = ids - valid_ids
    if invalid:
        raise ValueError(
            f"Invalid employee IDs: {sorted(invalid)}"
        )


def parse_time(value):
    if value is None or pd.isna(value) or str(value).strip() in {"", "nan", "NaT"}:
        return None

    parsed = pd.to_datetime(
        str(value).strip(),
        format="%H:%M",
        errors="coerce"
    )

    if pd.isna(parsed):
        raise ValueError(f"Invalid time value: {value}")

    return parsed


def validate_attendance_values(df):
    parsed_dates = pd.to_datetime(df["date"], errors="coerce")

    if parsed_dates.isna().any():
        raise ValueError("One or more attendance dates are invalid.")

    for index, row in df.iterrows():
        status = str(row["status"]).strip().lower()
        check_in = parse_time(row["check_in"])
        check_out = parse_time(row["check_out"])

        if status == "absent":
            continue

        if check_in is None or check_out is None:
            raise ValueError(
                f"Check-in and check-out are required for row {index + 2}."
            )

        if check_in >= check_out:
            raise ValueError(
                "Time-in must be before time-out."
            )


def calculate_working_hours(check_in, check_out):
    if check_in is None or check_out is None:
        return 0.0

    seconds = (check_out - check_in).total_seconds()

    if seconds < 0:
        raise ValueError("Time-in must be before time-out.")

    return round(seconds / 3600, 2)


def calculate_overtime(working_hours):
    if working_hours <= OVERTIME_THRESHOLD:
        return 0.0

    return round(working_hours - REGULAR_HOURS, 2)


def get_employee(connection, employee_code):
    return connection.execute(
        text("""
            SELECT
                employee_id,
                employee_code,
                employee_name,
                department_id
            FROM employees
            WHERE employee_code = :employee_code
        """),
        {"employee_code": employee_code}
    ).mappings().first()


def get_department_name(connection, department_id):
    return connection.execute(
        text("""
            SELECT department_name
            FROM departments
            WHERE department_id = :department_id
        """),
        {"department_id": department_id}
    ).scalar()


def is_holiday(connection, attendance_date):
    # Uses the holiday_date field used by the application's holiday logic.
    result = connection.execute(
        text("""
            SELECT holiday_id
            FROM holidays
            WHERE holiday_date = :attendance_date
            LIMIT 1
        """),
        {"attendance_date": attendance_date}
    ).scalar()

    return result is not None


def is_approved_leave(connection, employee_id, attendance_date):
    result = connection.execute(
        text("""
            SELECT leave_id
            FROM leaves
            WHERE employee_id = :employee_id
              AND leave_date = :leave_date
              AND status = 'Approved'
            LIMIT 1
        """),
        {
            "employee_id": employee_id,
            "leave_date": attendance_date
        }
    ).scalar()

    return result is not None


def calculate_status(
    connection,
    employee_id,
    attendance_date,
    check_in,
    working_hours,
):
    # Priority follows the business-rule hierarchy:
    # weekend -> holiday -> approved leave -> absent -> hours.
    if attendance_date.weekday() in (5, 6):
        return "Weekend"

    if is_holiday(connection, attendance_date):
        return "Holiday"

    if is_approved_leave(
        connection,
        employee_id,
        attendance_date
    ):
        return "On Leave"

    if check_in is None or working_hours <= 0:
        return "Absent"

    if working_hours < 4:
        return "Half Day"

    if working_hours >= 8:
        return "Present"

    return "Half Day"


def calculate_late_minutes(check_in):
    if check_in is None:
        return 0

    start = pd.to_datetime(
        STANDARD_START_TIME,
        format="%H:%M"
    )
    grace_end = pd.to_datetime(
        GRACE_END_TIME,
        format="%H:%M"
    )

    check_in = check_in.replace(
        year=1900,
        month=1,
        day=1
    )
    start = start.replace(year=1900, month=1, day=1)
    grace_end = grace_end.replace(year=1900, month=1, day=1)

    if check_in <= grace_end:
        return 0

    return max(
        0,
        int((check_in - start).total_seconds() / 60)
    )


def transform_attendance_data(df, connection):
    df = df.copy()

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    ).dt.date

    df["employee_id"] = (
        df["employee_id"].astype(str).str.strip()
    )
    df["employee_name"] = (
        df["employee_name"].astype(str).str.strip()
    )
    df["department"] = (
        df["department"].astype(str).str.strip()
    )

    working_hours = []
    overtime_hours = []
    final_statuses = []
    late_minutes = []

    for _, row in df.iterrows():
        employee_code = row["employee_id"]
        employee = get_employee(
            connection,
            employee_code
        )

        if employee is None:
            raise ValueError(
                f"Employee not found: {employee_code}"
            )

        uploaded_name = row["employee_name"].strip()
        database_name = str(
            employee["employee_name"]
        ).strip()

        if uploaded_name.lower() != database_name.lower():
            raise ValueError(
                f"Employee name mismatch for {employee_code}: "
                f"uploaded '{uploaded_name}', "
                f"database has '{database_name}'"
            )

        database_department = get_department_name(
            connection,
            employee["department_id"]
        )

        uploaded_department = row["department"].strip()

        if (
            database_department is not None
            and uploaded_department.lower()
            != str(database_department).strip().lower()
        ):
            raise ValueError(
                f"Department mismatch for {employee_code}: "
                f"uploaded '{uploaded_department}', "
                f"database has '{database_department}'"
            )

        check_in = parse_time(row["check_in"])
        check_out = parse_time(row["check_out"])

        input_status = str(row["status"]).strip().lower()

        if input_status == "absent":
            hours = 0.0
        else:
            if check_in is None or check_out is None:
                raise ValueError(
                    f"Check-in and check-out are required "
                    f"for employee {employee_code}."
                )

            hours = calculate_working_hours(
                check_in,
                check_out
            )

        status = calculate_status(
            connection=connection,
            employee_id=employee["employee_id"],
            attendance_date=row["date"],
            check_in=check_in,
            working_hours=hours,
        )

        working_hours.append(hours)
        overtime_hours.append(
            calculate_overtime(hours)
        )
        final_statuses.append(status)
        late_minutes.append(
            calculate_late_minutes(check_in)
        )

    df["working_hours"] = working_hours
    df["overtime_hours"] = overtime_hours
    df["status"] = final_statuses
    df["late_minutes"] = late_minutes

    return df


def process_attendance_file(file_path):
    df = read_attendance_file(file_path)

    validate_columns(df)
    validate_employee_ids(df)
    validate_attendance_values(df)

    with engine.connect() as connection:
        return transform_attendance_data(
            df,
            connection
        )


def load_attendance_to_database(df):
    records_received = len(df)
    records_inserted = 0
    duplicates_skipped = 0

    with engine.begin() as connection:
        # Check weekly cap using only records that will actually
        # be inserted, plus existing database attendance.
        weekly_upload = {}

        for _, row in df.iterrows():
            employee_code = str(row["employee_id"]).strip()
            attendance_date = row["date"]

            # Existing duplicate records are not counted toward
            # the new upload's weekly-hour total.
            employee = get_employee(
                connection,
                employee_code
            )
            if employee is None:
                raise ValueError(
                    f"Employee not found: {employee_code}"
                )

            existing = connection.execute(
                text("""
                    SELECT attendance_id
                    FROM attendance_logs
                    WHERE employee_id = :employee_id
                      AND attendance_date = :attendance_date
                """),
                {
                    "employee_id": employee["employee_id"],
                    "attendance_date": attendance_date
                }
            ).scalar()

            if existing is not None:
                continue

            week = (
                employee_code,
                attendance_date.isocalendar().year,
                attendance_date.isocalendar().week
            )

            weekly_upload[week] = (
                weekly_upload.get(week, 0.0)
                + float(row["working_hours"] or 0)
            )

        for (
            employee_code,
            year,
            week
        ), upload_hours in weekly_upload.items():

            employee = get_employee(
                connection,
                employee_code
            )

            existing_hours = connection.execute(
                text("""
                    SELECT COALESCE(SUM(a.working_hours), 0)
                    FROM attendance_logs a
                    WHERE a.employee_id = :employee_id
                      AND YEARWEEK(a.attendance_date, 1) = :year_week
                """),
                {
                    "employee_id": employee["employee_id"],
                    "year_week": year * 100 + week
                }
            ).scalar()

            if (
                float(existing_hours or 0)
                + upload_hours
                > WEEKLY_HOUR_CAP
            ):
                raise ValueError(
                    f"Weekly work-hour limit of "
                    f"{WEEKLY_HOUR_CAP:g} hours exceeded "
                    f"for employee {employee_code}."
                )

        for _, row in df.iterrows():
            employee_code = str(row["employee_id"]).strip()

            employee = get_employee(
                connection,
                employee_code
            )

            if employee is None:
                raise ValueError(
                    f"Employee not found: {employee_code}"
                )

            existing_record = connection.execute(
                text("""
                    SELECT attendance_id
                    FROM attendance_logs
                    WHERE employee_id = :employee_id
                      AND attendance_date = :attendance_date
                """),
                {
                    "employee_id": employee["employee_id"],
                    "attendance_date": row["date"]
                }
            ).scalar()

            if existing_record is not None:
                duplicates_skipped += 1
                continue

            connection.execute(
                text("""
                    INSERT INTO attendance_logs (
                        employee_id,
                        attendance_date,
                        status,
                        login_time,
                        logout_time,
                        working_hours,
                        overtime_hours,
                        late_minutes
                    )
                    VALUES (
                        :employee_id,
                        :attendance_date,
                        :status,
                        :login_time,
                        :logout_time,
                        :working_hours,
                        :overtime_hours,
                        :late_minutes
                    )
                """),
                {
                    "employee_id": employee["employee_id"],
                    "attendance_date": row["date"],
                    "status": row["status"],
                    "login_time": (
                        row["check_in"].strftime("%H:%M:%S")
                        if pd.notna(row["check_in"])
                        else None
                    ),
                    "logout_time": (
                        row["check_out"].strftime("%H:%M:%S")
                        if pd.notna(row["check_out"])
                        else None
                    ),
                    "working_hours": float(row["working_hours"]),
                    "overtime_hours": float(row["overtime_hours"]),
                    "late_minutes": int(row["late_minutes"]),
                }
            )

            records_inserted += 1

    return {
        "records_received": records_received,
        "inserted": records_inserted,
        "duplicates_skipped": duplicates_skipped,
    }
