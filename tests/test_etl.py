import pandas as pd
import pytest

from backend.etl import (
    parse_time,
    calculate_working_hours,
    calculate_overtime,
    calculate_late_minutes,
    get_business_rules,
)

def test_overtime_uses_custom_business_rules():
    assert calculate_overtime(
        10.0,
        overtime_threshold_hours=8.0,
        standard_work_hours=7.5,
    ) == 2.5


def test_late_minutes_uses_custom_business_rules():
    check_in = pd.to_datetime("10:00", format="%H:%M")

    assert calculate_late_minutes(
        check_in,
        standard_start_time="09:00",
        grace_period_minutes=30,
    ) == 60


def test_parse_time_valid():
    result = parse_time("09:30")

    assert result.hour == 9
    assert result.minute == 30


def test_parse_time_empty_returns_none():
    assert parse_time("") is None
    assert parse_time(None) is None


def test_parse_time_invalid_raises_error():
    with pytest.raises(ValueError):
        parse_time("25:99")


def test_calculate_working_hours():
    check_in = pd.to_datetime("09:00", format="%H:%M")
    check_out = pd.to_datetime("18:00", format="%H:%M")

    assert calculate_working_hours(check_in, check_out) == 9.0


def test_calculate_working_hours_missing_time():
    assert calculate_working_hours(None, None) == 0.0


def test_calculate_working_hours_invalid_order():
    check_in = pd.to_datetime("18:00", format="%H:%M")
    check_out = pd.to_datetime("09:00", format="%H:%M")

    with pytest.raises(ValueError):
        calculate_working_hours(check_in, check_out)


def test_overtime_below_threshold():
    assert calculate_overtime(8.0) == 0.0


def test_overtime_at_threshold():
    assert calculate_overtime(9.0) == 0.0


def test_overtime_above_threshold():
    assert calculate_overtime(10.5) == 2.5


def test_late_minutes_before_start():
    check_in = pd.to_datetime("09:00", format="%H:%M")

    assert calculate_late_minutes(check_in) == 0


def test_late_minutes_within_grace_period():
    check_in = pd.to_datetime("09:40", format="%H:%M")

    assert calculate_late_minutes(check_in) == 0


def test_late_minutes_after_grace_period():
    check_in = pd.to_datetime("10:00", format="%H:%M")

    assert calculate_late_minutes(check_in) == 30

def test_validate_attendance_values_valid_record():
    df = pd.DataFrame([
        {
            "date": "2026-09-01",
            "status": "Present",
            "check_in": "09:30",
            "check_out": "18:00",
        }
    ])

    # Should not raise an exception
    from backend.etl import validate_attendance_values

    validate_attendance_values(df)


def test_validate_attendance_values_invalid_date():
    df = pd.DataFrame([
        {
            "date": "invalid-date",
            "status": "Present",
            "check_in": "09:30",
            "check_out": "18:00",
        }
    ])

    from backend.etl import validate_attendance_values

    with pytest.raises(ValueError, match="attendance dates are invalid"):
        validate_attendance_values(df)


def test_validate_attendance_values_missing_check_in():
    df = pd.DataFrame([
        {
            "date": "2026-09-01",
            "status": "Present",
            "check_in": None,
            "check_out": "18:00",
        }
    ])

    from backend.etl import validate_attendance_values

    with pytest.raises(ValueError, match="Check-in and check-out are required"):
        validate_attendance_values(df)


def test_validate_attendance_values_missing_check_out():
    df = pd.DataFrame([
        {
            "date": "2026-09-01",
            "status": "Present",
            "check_in": "09:30",
            "check_out": None,
        }
    ])

    from backend.etl import validate_attendance_values

    with pytest.raises(ValueError, match="Check-in and check-out are required"):
        validate_attendance_values(df)


def test_validate_attendance_values_invalid_time_order():
    df = pd.DataFrame([
        {
            "date": "2026-09-01",
            "status": "Present",
            "check_in": "18:00",
            "check_out": "09:30",
        }
    ])

    from backend.etl import validate_attendance_values

    with pytest.raises(ValueError, match="Time-in must be before time-out"):
        validate_attendance_values(df)


def test_validate_attendance_values_absent_can_have_no_times():
    df = pd.DataFrame([
        {
            "date": "2026-09-01",
            "status": "Absent",
            "check_in": None,
            "check_out": None,
        }
    ])

    from backend.etl import validate_attendance_values

    # Absent records are allowed to have no check-in/check-out.
    validate_attendance_values(df)