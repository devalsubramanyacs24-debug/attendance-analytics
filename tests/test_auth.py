import pytest
from fastapi import HTTPException

from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    require_role,
)


def test_password_hash_and_verify():
    password = "TestPassword123!"

    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_create_and_decode_access_token():
    data = {
        "user_id": 1,
        "employee_id": 1,
        "role": "SUPER_ADMIN",
    }

    token = create_access_token(data)
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["user_id"] == 1
    assert payload["employee_id"] == 1
    assert payload["role"] == "SUPER_ADMIN"
    assert "exp" in payload


def test_invalid_token_is_rejected():
    payload = decode_access_token("this-is-not-a-valid-jwt")

    assert payload is None


def test_tampered_token_is_rejected():
    token = create_access_token({
        "user_id": 1,
        "role": "EMPLOYEE",
    })

    parts = token.split(".")

    # Change the JWT payload without changing its signature.
    tampered_token = (
        parts[0]
        + "."
        + parts[1][:-1]
        + ("A" if parts[1][-1] != "A" else "B")
        + "."
        + parts[2]
    )

    assert decode_access_token(tampered_token) is None


def test_super_admin_role_is_allowed():
    role_checker = require_role("SUPER_ADMIN")

    user = {
        "user_id": 1,
        "role": "SUPER_ADMIN",
    }

    result = role_checker(user)

    assert result == user


def test_employee_role_is_rejected_from_super_admin_access():
    role_checker = require_role("SUPER_ADMIN")

    user = {
        "user_id": 2,
        "role": "EMPLOYEE",
    }

    with pytest.raises(HTTPException) as exc_info:
        role_checker(user)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == (
        "You do not have permission to access this resource"
    )


def test_multiple_allowed_roles():
    role_checker = require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DATA_ANALYST",
    )

    for role in ["SUPER_ADMIN", "HR_MANAGER", "DATA_ANALYST"]:
        user = {
            "user_id": 1,
            "role": role,
        }

        assert role_checker(user) == user


def test_unlisted_role_is_rejected():
    role_checker = require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
    )

    user = {
        "user_id": 3,
        "role": "EMPLOYEE",
    }

    with pytest.raises(HTTPException) as exc_info:
        role_checker(user)

    assert exc_info.value.status_code == 403