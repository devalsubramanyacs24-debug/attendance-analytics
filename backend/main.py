import os 
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import date, datetime, timezone
import json 
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from pydantic import BaseModel
from backend.database import SessionLocal, AuditLog
from backend.scheduler import start_scheduler
from dotenv import load_dotenv
from io import BytesIO
from fastapi.responses import StreamingResponse
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)

load_dotenv("env/.env")

print(
    "GEMINI KEY LOADED:",
    bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
)

print(
    "GEMINI MODEL:",
    os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
)

from backend.database import engine
from backend.etl import (
    process_attendance_file,
    load_attendance_to_database
)
from backend.auth import (
    verify_password,
    hash_password,
    create_access_token,
    get_current_user,
    require_role,
    decode_access_token
)
app = FastAPI()

def log_audit_event(
    action,
    module,
    user_id=None,
    resource=None,
    resource_id=None,
    old_values=None,
    new_values=None,
    ip_address=None,
    user_agent=None,
    status="SUCCESS",
    error_message=None,
):
    db = SessionLocal()

    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            resource=resource,
            resource_id=str(resource_id) if resource_id is not None else None,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            error_message=error_message,
        )

        db.add(audit_log)
        db.commit()

    except Exception as exc:
        db.rollback()
        print("AUDIT LOG ERROR:", repr(exc))

    finally:
        db.close()
from pydantic import BaseModel, Field

# =========================
# SRS: SYSTEM CONFIGURATION
# =========================

class AdminSettingsUpdate(BaseModel):
    standard_start_time: str = Field(default="09:30")
    grace_period_minutes: int = Field(default=15, ge=0, le=120)
    standard_work_hours: float = Field(default=8, gt=0, le=24)
    overtime_threshold_hours: float = Field(default=9, gt=0, le=24)
    weekly_hour_cap: float = Field(default=60, gt=0, le=168)
    half_day_hours: float = Field(default=4, gt=0, le=24)
    timezone: str = Field(default="Asia/Kolkata")

class KPIConfigurationUpdate(BaseModel):
    attendance_rate: bool = True
    absenteeism_rate: bool = True
    late_arrival_rate: bool = True
    overtime_hours: bool = True
    working_days: bool = True
    workforce_utilization: bool = True
    average_working_hours: bool = True
    department_attendance: bool = True
    attendance_trend: bool = True
    dropout_rate: bool = True
    employee_retention_score: bool = True
    productivity_score: bool = False

def ensure_admin_configuration_tables():
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value VARCHAR(255) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS kpi_configuration (
                config_id INT PRIMARY KEY,
                attendance_rate BOOLEAN NOT NULL DEFAULT TRUE,
                absenteeism_rate BOOLEAN NOT NULL DEFAULT TRUE,
                late_arrival_rate BOOLEAN NOT NULL DEFAULT TRUE,
                overtime_hours BOOLEAN NOT NULL DEFAULT TRUE,
                working_days BOOLEAN NOT NULL DEFAULT TRUE,
                workforce_utilization BOOLEAN NOT NULL DEFAULT TRUE,
                average_working_hours BOOLEAN NOT NULL DEFAULT TRUE,
                department_attendance BOOLEAN NOT NULL DEFAULT TRUE,
                attendance_trend BOOLEAN NOT NULL DEFAULT TRUE,
                dropout_rate BOOLEAN NOT NULL DEFAULT TRUE,
                employee_retention_score BOOLEAN NOT NULL DEFAULT TRUE,
                productivity_score BOOLEAN NOT NULL DEFAULT FALSE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
        """))

        defaults = {
            "standard_start_time": "09:30",
            "grace_period_minutes": "15",
            "standard_work_hours": "8",
            "overtime_threshold_hours": "9",
            "weekly_hour_cap": "60",
            "half_day_hours": "4",
            "timezone": "Asia/Kolkata",
        }

        for key, value in defaults.items():
            connection.execute(
                text("""
                    INSERT IGNORE INTO system_settings
                    (setting_key, setting_value)
                    VALUES (:key, :value)
                """),
                {"key": key, "value": value},
            )

        connection.execute(text("""
            INSERT IGNORE INTO kpi_configuration (config_id)
            VALUES (1)
        """))

ensure_admin_configuration_tables()


@app.get(
    "/api/admin/settings",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def get_admin_settings():
    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT setting_key, setting_value
                FROM system_settings
                ORDER BY setting_key
            """)
        ).mappings().all()

        kpi = connection.execute(
            text("""
                SELECT
                    attendance_rate,
                    absenteeism_rate,
                    late_arrival_rate,
                    overtime_hours,
                    working_days,
                    workforce_utilization,
                    average_working_hours,
                    department_attendance,
                    attendance_trend,
                    dropout_rate,
                    employee_retention_score,
                    productivity_score
                FROM kpi_configuration
                WHERE config_id = 1
            """)
        ).mappings().first()

    return {
        "system_settings": {
            row["setting_key"]: row["setting_value"]
            for row in rows
        },
        "kpis": dict(kpi) if kpi else {},
    }


@app.put(
    "/api/admin/settings",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def update_admin_settings(
    settings: AdminSettingsUpdate,
    current_user=Depends(get_current_user)
):
    values = settings.model_dump()

    # Basic HH:MM validation without changing the existing ETL behavior.
    try:
        datetime.strptime(values["standard_start_time"], "%H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="standard_start_time must use HH:MM format"
        )

    with engine.begin() as connection:
        for key, value in values.items():
            connection.execute(
                text("""
                    INSERT INTO system_settings
                    (setting_key, setting_value)
                    VALUES (:key, :value)
                    ON DUPLICATE KEY UPDATE
                        setting_value = VALUES(setting_value)
                """),
                {"key": key, "value": str(value)},
            )

    log_audit_event(
        action="SYSTEM_SETTINGS_UPDATED",
        module="SYSTEM_ADMINISTRATION",
        user_id=current_user["user_id"],
        resource="SYSTEM_SETTINGS",
        new_values=values,
        status="SUCCESS",
    )

    return {
        "message": "System settings updated successfully",
        "settings": values,
    }


@app.put(
    "/api/admin/kpis",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def update_admin_kpis(
    config: KPIConfigurationUpdate,
    current_user=Depends(get_current_user)
):
    values = config.model_dump()

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE kpi_configuration
                SET
                    attendance_rate = :attendance_rate,
                    absenteeism_rate = :absenteeism_rate,
                    late_arrival_rate = :late_arrival_rate,
                    overtime_hours = :overtime_hours,
                    working_days = :working_days,
                    workforce_utilization = :workforce_utilization,
                    average_working_hours = :average_working_hours,
                    department_attendance = :department_attendance,
                    attendance_trend = :attendance_trend,
                    dropout_rate = :dropout_rate,
                    employee_retention_score = :employee_retention_score,
                    productivity_score = :productivity_score
                WHERE config_id = 1
            """),
            values,
        )

    log_audit_event(
        action="KPI_CONFIGURATION_UPDATED",
        module="SYSTEM_ADMINISTRATION",
        user_id=current_user["user_id"],
        resource="KPI_CONFIGURATION",
        new_values=values,
        status="SUCCESS",
    )

    return {
        "message": "KPI configuration updated successfully",
        "kpis": values,
    }


@app.put(
    "/api/admin/business-rules",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def update_business_rules(
    settings: AdminSettingsUpdate,
    current_user=Depends(get_current_user)
):
    # Business-rule settings use the same persisted configuration table.
    values = settings.model_dump()

    try:
        datetime.strptime(values["standard_start_time"], "%H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="standard_start_time must use HH:MM format"
        )

    with engine.begin() as connection:
        for key, value in values.items():
            connection.execute(
                text("""
                    INSERT INTO system_settings
                    (setting_key, setting_value)
                    VALUES (:key, :value)
                    ON DUPLICATE KEY UPDATE
                        setting_value = VALUES(setting_value)
                """),
                {"key": key, "value": str(value)},
            )

    log_audit_event(
        action="BUSINESS_RULES_UPDATED",
        module="SYSTEM_ADMINISTRATION",
        user_id=current_user["user_id"],
        resource="BUSINESS_RULES",
        new_values=values,
        status="SUCCESS",
    )

    return {
        "message": "Business rules updated successfully",
        "business_rules": values,
    }

class LoginRequest(BaseModel):
    email: str
    password: str

# Multi-department assignment support for Department Managers.
# The table is created automatically so the application remains self-contained.
def ensure_manager_department_table():
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS department_manager_departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                department_id INT NOT NULL,
                UNIQUE KEY uq_manager_department (user_id, department_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
            )
        """))

        # Requested default: Priya Nair manages HR + IT.
        connection.execute(text("""
            INSERT IGNORE INTO department_manager_departments (user_id, department_id)
            SELECT u.user_id, d.department_id
            FROM users u
            JOIN departments d ON d.department_name IN ('HR', 'IT')
            WHERE LOWER(u.email) = 'priya@attendance.com'
              AND u.role = 'DEPARTMENT_MANAGER'
        """))


ensure_manager_department_table()
# =========================
# REAL-TIME DASHBOARD
# =========================

class DashboardConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection)

@app.on_event("startup")
def startup_event():
    start_scheduler()


dashboard_manager = DashboardConnectionManager()

def get_current_user_from_token(token: str):
    return decode_access_token(token)
@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008)
        return

    current_user = get_current_user_from_token(token)

    if current_user is None:
        await websocket.close(code=1008)
        return

    await dashboard_manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        dashboard_manager.disconnect(websocket)

    except Exception:
        dashboard_manager.disconnect(websocket)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_manager_department_ids(connection, current_user):
    if current_user.get("role") != "DEPARTMENT_MANAGER":
        return []

    rows = connection.execute(
        text("""
            SELECT department_id
            FROM department_manager_departments
            WHERE user_id = :user_id
            ORDER BY department_id
        """),
        {"user_id": current_user.get("user_id")},
    ).scalars().all()

    return [int(value) for value in rows]


def manager_scope_sql(alias="e"):
    return (
        f"{alias}.department_id IN "
        "(SELECT department_id FROM department_manager_departments "
        "WHERE user_id = :manager_user_id)"
    )

@app.post("/api/auth/login")
def login(request: LoginRequest):

    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    user_id,
                    employee_id,
                    name,
                    email,
                    password_hash,
                    role,
                    is_active
                FROM users
                WHERE email = :email
            """),
            {
                "email": request.email
            }
        ).mappings().first()

    if result is None:
        log_audit_event(
            action="LOGIN_FAILED",
            module="AUTHENTICATION",
            resource="USER",
            resource_id=request.email,
            status="FAILED",
            error_message="Invalid email or password",
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not result["is_active"]:
        log_audit_event(
            action="LOGIN_FAILED",
            module="AUTHENTICATION",
            user_id=result["user_id"],
            resource="USER",
            resource_id=result["user_id"],
            status="FAILED",
            error_message="User account is inactive",
        )

        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    if not verify_password(
        request.password,
        result["password_hash"]
    ):
        log_audit_event(
            action="LOGIN_FAILED",
            module="AUTHENTICATION",
            user_id=result["user_id"],
            resource="USER",
            resource_id=result["user_id"],
            status="FAILED",
            error_message="Invalid email or password",
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "user_id": result["user_id"],
        "employee_id": result["employee_id"],
        "role": result["role"]
    })

    log_audit_event(
        action="LOGIN",
        module="AUTHENTICATION",
        user_id=result["user_id"],
        resource="USER",
        resource_id=result["user_id"],
        status="SUCCESS",
    )

    with engine.connect() as connection:
        department_ids = connection.execute(
            text("""
                SELECT department_id
                FROM department_manager_departments
                WHERE user_id = :user_id
                ORDER BY department_id
            """),
            {"user_id": result["user_id"]},
        ).scalars().all()

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": result["user_id"],
            "employee_id": result["employee_id"],
            "name": result["name"],
            "email": result["email"],
            "role": result["role"],
            "department_ids": [int(v) for v in department_ids]
        }
    }
@app.post("/api/auth/logout")
def logout(
    current_user=Depends(get_current_user)
):
    log_audit_event(
        action="LOGOUT",
        module="AUTHENTICATION",
        user_id=current_user["user_id"],
        resource="USER",
        resource_id=current_user["user_id"],
        status="SUCCESS",
    )

    return {
        "message": "Logout successful"
    }
@app.get("/api/auth/me")
def get_me(
    current_user=Depends(get_current_user)
):
    return {
        "user_id": current_user.get("user_id"),
        "employee_id": current_user.get("employee_id"),
        "role": current_user.get("role")
    }
@app.post("/api/auth/change-password")
def change_password(
    current_password: str,
    new_password: str,
    current_user=Depends(get_current_user)
):
    employee_id = current_user.get("employee_id")

    if not current_password or not new_password:
        raise HTTPException(
            status_code=400,
            detail="Current password and new password are required"
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long"
        )

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                SELECT password_hash
                FROM users
                WHERE employee_id = :employee_id
            """),
            {
                "employee_id": employee_id
            }
        )

        row = result.fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        if not verify_password(current_password, row.password_hash):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect"
            )

        new_password_hash = hash_password(new_password)

        connection.execute(
            text("""
                UPDATE users
                SET password_hash = :password_hash
                WHERE employee_id = :employee_id
            """),
            {
                "password_hash": new_password_hash,
                "employee_id": employee_id
            }
        )

    return {
        "message": "Password changed successfully"
    }
@app.post("/api/admin/reset-password")
def admin_reset_password(
    user_id: int,
    new_password: str,
    current_user=Depends(
        require_role("SUPER_ADMIN", "HR_MANAGER")
    )
):
    """
    Allow Super Admin or HR Manager to reset
    another user's password.
    """

    if not new_password:
        raise HTTPException(
            status_code=400,
            detail="New password is required"
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long"
        )

    # Prevent an administrator from accidentally
    # resetting a non-existent user.
    with engine.begin() as connection:

        result = connection.execute(
            text("""
                SELECT
                    user_id,
                    name,
                    email,
                    role,
                    is_active
                FROM users
                WHERE user_id = :user_id
            """),
            {
                "user_id": user_id
            }
        )

        target_user = result.fetchone()

        if target_user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        if not target_user.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot reset password for an inactive user"
            )

        new_password_hash = hash_password(
            new_password
        )

        connection.execute(
            text("""
                UPDATE users
                SET password_hash = :password_hash
                WHERE user_id = :user_id
            """),
            {
                "password_hash": new_password_hash,
                "user_id": user_id
            }
        )

    # Record the password reset in the audit log.
    log_audit_event(
        action="PASSWORD_RESET",
        module="USER_MANAGEMENT",
        user_id=current_user["user_id"],
        resource="USER",
        resource_id=user_id,
        status="SUCCESS",
    )

    return {
        "message": "Password reset successfully",
        "user_id": user_id,
        "name": target_user.name,
        "email": target_user.email,
        "role": target_user.role
    }

# =========================
# ADMIN USER MANAGEMENT
# =========================

class AdminUserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str
    employee_id: int | None = None
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    employee_id: int | None = None
    is_active: bool | None = None


VALID_USER_ROLES = {
    "SUPER_ADMIN",
    "HR_MANAGER",
    "DEPARTMENT_MANAGER",
    "EXECUTIVE",
    "EMPLOYEE",
    "DATA_ANALYST",
}


@app.get(
    "/api/admin/users",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def get_admin_users():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    user_id,
                    employee_id,
                    name,
                    email,
                    role,
                    is_active
                FROM users
                ORDER BY name
            """)
        )

        return [
            dict(row._mapping)
            for row in result
        ]


@app.post(
    "/api/admin/users",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def create_admin_user(
    user: AdminUserCreate,
    current_user=Depends(get_current_user)
):
    if user.role not in VALID_USER_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )

    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )

    with engine.begin() as connection:
        existing = connection.execute(
            text("""
                SELECT user_id
                FROM users
                WHERE email = :email
            """),
            {"email": user.email}
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )

        if user.employee_id is not None:
            employee_exists = connection.execute(
                text("""
                    SELECT employee_id
                    FROM employees
                    WHERE employee_id = :employee_id
                """),
                {"employee_id": user.employee_id}
            ).first()

            if employee_exists is None:
                raise HTTPException(
                    status_code=404,
                    detail="Employee not found"
                )

        password_hash = hash_password(user.password)

        result = connection.execute(
            text("""
                INSERT INTO users
                (
                    employee_id,
                    name,
                    email,
                    password_hash,
                    role,
                    is_active
                )
                VALUES
                (
                    :employee_id,
                    :name,
                    :email,
                    :password_hash,
                    :role,
                    :is_active
                )
            """),
            {
                "employee_id": user.employee_id,
                "name": user.name,
                "email": user.email,
                "password_hash": password_hash,
                "role": user.role,
                "is_active": user.is_active,
            }
        )

        user_id = result.lastrowid

    log_audit_event(
        action="USER_CREATED",
        module="USER_MANAGEMENT",
        user_id=current_user["user_id"],
        resource="USER",
        resource_id=user_id,
        new_values={
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "employee_id": user.employee_id,
            "is_active": user.is_active,
        },
        status="SUCCESS",
    )

    return {
        "message": "User created successfully",
        "user_id": user_id,
    }


@app.put(
    "/api/admin/users/{user_id}",
    dependencies=[Depends(require_role("SUPER_ADMIN"))]
)
def update_admin_user(
    user_id: int,
    user: AdminUserUpdate,
    current_user=Depends(get_current_user)
):
    update_data = user.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    if "role" in update_data and update_data["role"] not in VALID_USER_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )

    with engine.begin() as connection:
        existing = connection.execute(
            text("""
                SELECT
                    user_id,
                    name,
                    email,
                    role,
                    employee_id,
                    is_active
                FROM users
                WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        ).mappings().first()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        if "email" in update_data:
            duplicate = connection.execute(
                text("""
                    SELECT user_id
                    FROM users
                    WHERE email = :email
                      AND user_id <> :user_id
                """),
                {
                    "email": update_data["email"],
                    "user_id": user_id,
                }
            ).first()

            if duplicate:
                raise HTTPException(
                    status_code=400,
                    detail="Email already exists"
                )

        if "employee_id" in update_data and update_data["employee_id"] is not None:
            employee_exists = connection.execute(
                text("""
                    SELECT employee_id
                    FROM employees
                    WHERE employee_id = :employee_id
                """),
                {"employee_id": update_data["employee_id"]}
            ).first()

            if employee_exists is None:
                raise HTTPException(
                    status_code=404,
                    detail="Employee not found"
                )

        allowed_fields = {
            "name",
            "email",
            "role",
            "employee_id",
            "is_active",
        }

        fields = {
            key: value
            for key, value in update_data.items()
            if key in allowed_fields
        }

        set_clause = ", ".join(
            f"{field} = :{field}"
            for field in fields
        )

        fields["user_id"] = user_id

        connection.execute(
            text(f"""
                UPDATE users
                SET {set_clause}
                WHERE user_id = :user_id
            """),
            fields
        )

    log_audit_event(
        action="USER_UPDATED",
        module="USER_MANAGEMENT",
        user_id=current_user["user_id"],
        resource="USER",
        resource_id=user_id,
        old_values=dict(existing),
        new_values=update_data,
        status="SUCCESS",
    )

    return {
        "message": "User updated successfully",
        "user_id": user_id,
    }


@app.get("/api/employee/profile")
def get_employee_profile(
    current_user=Depends(get_current_user)
):
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
    e.employee_id,
    e.employee_code,
    e.employee_name,
    u.email,
    u.role,
    d.department_name,
    e.designation,
    e.status
FROM employees e
JOIN users u
    ON e.employee_id = u.employee_id
LEFT JOIN departments d
    ON e.department_id = d.department_id
WHERE e.employee_id = :employee_id
            """),
            {
                "employee_id": employee_id
            }
        )

        row = result.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    return dict(row._mapping)
@app.get("/api/employee/attendance")
def get_my_attendance(
    current_user=Depends(require_role("EMPLOYEE"))
):
    employee_id = current_user.get("employee_id")

    if employee_id is None:
        raise HTTPException(
            status_code=400,
            detail="Employee account is not linked to an employee record"
        )
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    e.employee_code,
                    e.employee_name,
                    a.attendance_date,
                    a.status,
                    a.login_time,
                    a.logout_time,
                    a.working_hours,
                    a.overtime_hours,
                    a.late_minutes
                FROM attendance_logs a
                JOIN employees e
                    ON a.employee_id = e.employee_id
                WHERE a.employee_id = :employee_id
                ORDER BY a.attendance_date DESC
            """),
            {
                "employee_id": employee_id
            }
        )

        attendance = []

        for row in result:
            attendance.append(dict(row._mapping))

    return attendance

@app.get("/")
def home():
    return {
        "message": "Attendance Analytics API is running"
    }


@app.get("/db-test")
def database_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT DATABASE()"))
        database_name = result.scalar()

    return {
        "message": "Database connection successful",
        "database": database_name
    }
@app.get("/departments")
def get_departments(
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        if role == "DEPARTMENT_MANAGER":

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            result = connection.execute(
                text("""
                    SELECT department_id, department_name
                    FROM departments
                    WHERE department_id IN (
                        SELECT department_id
                        FROM department_manager_departments
                        WHERE user_id = :user_id
                    )
                    ORDER BY department_name
                """),
                {"user_id": current_user.get("user_id")},
            )

        else:

            result = connection.execute(
                text("""
                    SELECT
                        department_id,
                        department_name
                    FROM departments
                    ORDER BY department_name
                """)
            )

        departments = [
            dict(row._mapping)
            for row in result
        ]

    return departments
@app.get("/employees")
def get_employees(
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER"
    ))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    e.employee_id,
                    e.employee_code,
                    e.employee_name,
                    e.email,
                    e.department_id,
                    d.department_name,
                    e.designation,
                    e.joining_date,
                    e.status
                FROM employees e
                JOIN departments d
                    ON e.department_id = d.department_id
                ORDER BY e.employee_name
            """)
        )

        employees = [
            dict(row._mapping)
            for row in result
        ]

    return employees
class EmployeeCreate(BaseModel):
    employee_code: str
    employee_name: str
    email: str | None = None
    department_id: int
    designation: str | None = None
    joining_date: date | None = None
    status: str = "Active"


class EmployeeUpdate(BaseModel):
    employee_code: str | None = None
    employee_name: str | None = None
    email: str | None = None
    department_id: int | None = None
    designation: str | None = None
    joining_date: date | None = None
    status: str | None = None


@app.post("/employees")
def create_employee(
    employee: EmployeeCreate,
    current_user=Depends(require_role("SUPER_ADMIN", "HR_MANAGER"))
):
    with engine.begin() as connection:

        existing = connection.execute(
            text("""
                SELECT employee_id
                FROM employees
                WHERE employee_code = :employee_code
            """),
            {"employee_code": employee.employee_code}
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Employee code already exists"
            )

        if employee.email:
            existing_email = connection.execute(
                text("""
                    SELECT employee_id
                    FROM employees
                    WHERE email = :email
                """),
                {"email": employee.email}
            ).first()

            if existing_email:
                raise HTTPException(
                    status_code=400,
                    detail="Email already exists"
                )

        connection.execute(
            text("""
                INSERT INTO employees
                (
                    employee_code,
                    employee_name,
                    email,
                    department_id,
                    designation,
                    joining_date,
                    status
                )
                VALUES
                (
                    :employee_code,
                    :employee_name,
                    :email,
                    :department_id,
                    :designation,
                    :joining_date,
                    :status
                )
            """),
            {
                "employee_code": employee.employee_code,
                "employee_name": employee.employee_name,
                "email": employee.email,
                "department_id": employee.department_id,
                "designation": employee.designation,
                "joining_date": employee.joining_date,
                "status": employee.status
            }
        )

    return {
        "message": "Employee created successfully"
    }


@app.put("/employees/{employee_id}")
def update_employee(
    employee_id: int,
    employee: EmployeeUpdate,
    current_user=Depends(require_role("SUPER_ADMIN", "HR_MANAGER"))
):
    update_data = employee.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    allowed_fields = {
        "employee_code",
        "employee_name",
        "email",
        "department_id",
        "designation",
        "joining_date",
        "status"
    }

    fields = {
        key: value
        for key, value in update_data.items()
        if key in allowed_fields
    }

    if not fields:
        raise HTTPException(
            status_code=400,
            detail="No valid fields provided"
        )

    set_clause = ", ".join(
        f"{field} = :{field}"
        for field in fields
    )

    fields["employee_id"] = employee_id

    with engine.begin() as connection:
        result = connection.execute(
            text(f"""
                UPDATE employees
                SET {set_clause}
                WHERE employee_id = :employee_id
            """),
            fields
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )

    return {
        "message": "Employee updated successfully"
    }


@app.delete("/employees/{employee_id}")
def delete_employee(
    employee_id: int,
    current_user=Depends(
        require_role("SUPER_ADMIN", "HR_MANAGER")
    )
):
    with engine.begin() as connection:

        result = connection.execute(
            text("""
                UPDATE employees
                SET status = 'Inactive'
                WHERE employee_id = :employee_id
            """),
            {
                "employee_id": employee_id
            }
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )

    return {
        "message": "Employee deactivated successfully"
    }
@app.delete("/employees/{employee_id}/permanent")
def permanently_delete_employee(
    employee_id: int,
    current_user=Depends(require_role("SUPER_ADMIN", "HR_MANAGER"))
):
    with engine.begin() as connection:

        employee = connection.execute(
            text("""
                SELECT employee_id, employee_name
                FROM employees
                WHERE employee_id = :employee_id
            """),
            {"employee_id": employee_id}
        ).mappings().first()

        if employee is None:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )

        # Delete attendance history
        connection.execute(
            text("""
                DELETE FROM attendance_logs
                WHERE employee_id = :employee_id
            """),
            {"employee_id": employee_id}
        )

        # Delete leave records
        connection.execute(
            text("""
                DELETE FROM leaves
                WHERE employee_id = :employee_id
            """),
            {"employee_id": employee_id}
        )

        # Delete department-manager assignments, if any
        connection.execute(
            text("""
                DELETE FROM department_manager_departments
                WHERE user_id IN (
                    SELECT user_id
                    FROM users
                    WHERE employee_id = :employee_id
                )
            """),
            {"employee_id": employee_id}
        )

        # Delete linked user account
        connection.execute(
            text("""
                DELETE FROM users
                WHERE employee_id = :employee_id
            """),
            {"employee_id": employee_id}
        )

        # Finally delete employee
        connection.execute(
            text("""
                DELETE FROM employees
                WHERE employee_id = :employee_id
            """),
            {"employee_id": employee_id}
        )

    return {
        "message": f"Employee {employee['employee_name']} permanently deleted."
    }
@app.get("/attendance")
def get_attendance(
    start_date: str = Query(None),
    end_date: str = Query(None),
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST"
    ))
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        query = """
            SELECT
                a.attendance_id,
                e.employee_code,
                e.employee_name,
                d.department_name,
                a.attendance_date,
                a.status,
                a.login_time,
                a.logout_time,
                a.working_hours,
                a.overtime_hours,
                a.late_minutes
            FROM attendance_logs a
            JOIN employees e
                ON a.employee_id = e.employee_id
            JOIN departments d
                ON e.department_id = d.department_id
            WHERE 1=1
        """

        params = {}

        if start_date:
            query += " AND a.attendance_date >= :start_date"
            params["start_date"] = start_date

        if end_date:
            query += " AND a.attendance_date <= :end_date"
            params["end_date"] = end_date

        # Department Managers can only see their own department
        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            query += " AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            params["manager_user_id"] = current_user.get("user_id")

        query += """
            ORDER BY a.attendance_date DESC, e.employee_code
        """

        result = connection.execute(
            text(query),
            params
        )

        attendance = []

        for row in result:
            attendance.append(dict(row._mapping))

    return attendance
@app.get("/analytics/summary")
def attendance_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    department: str | int | None = None,
    current_user=Depends(get_current_user),
):
    db=SessionLocal()
    """
    Attendance KPI summary.

    KPIs:
    - Total Employees
    - Attendance Records
    - Present
    - Absent
    - Late
    - Attendance Rate
    - Absenteeism Rate
    - Late Arrival Rate
    - Average Working Hours
    - Total Overtime Hours
    """

    role = str(
        current_user.get("role", "")
    ).upper()

    user_department_id = current_user.get(
        "department_id"
    )

    # --------------------------------------------------
    # Department access control
    # --------------------------------------------------

    manager_department_ids = []
    if role == "DEPARTMENT_MANAGER":
        with engine.connect() as connection:
            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )
        if not manager_department_ids:
            raise HTTPException(
                status_code=403,
                detail="No departments are assigned to this department manager"
            )
        if department and int(department) not in manager_department_ids:
            raise HTTPException(
                status_code=403,
                detail="You can only access your assigned departments"
            )

    attendance_conditions = []
    employee_conditions = []
    params = {}

    # --------------------------------------------------
    # Date filter
    # --------------------------------------------------

    if start_date:
        attendance_conditions.append(
            "a.attendance_date >= :start_date"
        )
        params["start_date"] = start_date

    if end_date:
        attendance_conditions.append(
            "a.attendance_date <= :end_date"
        )
        params["end_date"] = end_date

    # --------------------------------------------------
    # Department filter
    # --------------------------------------------------

    if department:
        if role == "DEPARTMENT_MANAGER":
            attendance_conditions.append(manager_scope_sql("e"))
            employee_conditions.append(manager_scope_sql("employees"))
            params["manager_user_id"] = current_user.get("user_id")
        else:
            # Dashboards use department names; also accept numeric IDs
            # for backward compatibility.
            if str(department).isdigit():
                attendance_conditions.append(
                    "e.department_id = :department_id"
                )
                employee_conditions.append(
                    "department_id = :department_id"
                )
                params["department_id"] = int(department)
            else:
                attendance_conditions.append(
                    "e.department_id = ("
                    "SELECT department_id FROM departments "
                    "WHERE department_name = :department_name)"
                )
                employee_conditions.append(
                    "department_id = ("
                    "SELECT department_id FROM departments "
                    "WHERE department_name = :department_name)"
                )
                params["department_name"] = str(department)
    elif role == "DEPARTMENT_MANAGER":
        attendance_conditions.append(manager_scope_sql("e"))
        employee_conditions.append(manager_scope_sql("employees"))
        params["manager_user_id"] = current_user.get("user_id")

    attendance_where = ""

    if attendance_conditions:
        attendance_where = (
            "WHERE " + " AND ".join(attendance_conditions)
        )

    employee_where = ""

    if employee_conditions:
        employee_where = (
            "WHERE " + " AND ".join(employee_conditions)
        )

    # --------------------------------------------------
    # Employee count
    # --------------------------------------------------

    total_employees = db.execute(
        text(f"""
            SELECT COUNT(*)
            FROM employees
            {employee_where}
        """),
        params,
    ).scalar() or 0

    # --------------------------------------------------
    # Attendance KPIs
    #
    # Exclude Weekend / Holiday / On Leave from the
    # attendance-performance denominator.
    # --------------------------------------------------

    result = db.execute(
        text(f"""
            SELECT

                COUNT(*) AS attendance_records,

                SUM(
                    CASE
                        WHEN a.status = 'Present'
                        THEN 1
                        ELSE 0
                    END
                ) AS present_count,

                SUM(
                    CASE
                        WHEN a.status = 'Absent'
                        THEN 1
                        ELSE 0
                    END
                ) AS absent_count,

                SUM(
                    CASE
                        WHEN COALESCE(a.late_minutes, 0) > 0
                        THEN 1
                        ELSE 0
                    END
                ) AS late_count,

                SUM(
                    CASE
                        WHEN a.status IN (
                            'Present',
                            'Absent',
                            'Half Day',
                            'Late'
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS working_day_records,

                AVG(
                    CASE
                        WHEN a.status NOT IN (
                            'Weekend',
                            'Holiday',
                            'On Leave'
                        )
                        THEN a.working_hours
                        ELSE NULL
                    END
                ) AS avg_working_hours,

                COALESCE(
                    SUM(
                        CASE
                            WHEN a.status NOT IN (
                                'Weekend',
                                'Holiday',
                                'On Leave'
                            )
                            THEN COALESCE(a.working_hours, 0)
                            ELSE 0
                        END
                    ),
                    0
                ) AS actual_working_hours,

                COALESCE(
                    SUM(
                        COALESCE(
                            a.overtime_hours,
                            0
                        )
                    ),
                    0
                ) AS total_overtime

            FROM attendance_logs a

            JOIN employees e
                ON a.employee_id = e.employee_id

            {attendance_where}
        """),
        params,
    ).mappings().first()

    attendance_records = int(
        result["attendance_records"] or 0
    )

    present_count = int(
        result["present_count"] or 0
    )

    absent_count = int(
        result["absent_count"] or 0
    )

    late_count = int(
        result["late_count"] or 0
    )

    working_day_records = int(
        result["working_day_records"] or 0
    )

    avg_working_hours = round(
        float(
            result["avg_working_hours"] or 0
        ),
        2,
    )

    total_overtime = round(
        float(
            result["total_overtime"] or 0
        ),
        2,
    )

    actual_working_hours = round(
        float(
            result["actual_working_hours"] or 0
        ),
        2,
    )

    # --------------------------------------------------
    # Additional SRS KPI calculations
    # --------------------------------------------------

    available_hours = working_day_records * 8

    workforce_utilization = (
        round(
            (actual_working_hours / available_hours) * 100,
            2,
        )
        if available_hours > 0
        else 0
    )

    # Employees whose attendance is below 70%.
    dropout_result = db.execute(
        text(f"""
            SELECT COUNT(*)
            FROM (
                SELECT
                    e.employee_id,
                    SUM(
                        CASE
                            WHEN a.status = 'Present'
                            THEN 1 ELSE 0
                        END
                    )
                    /
                    NULLIF(
                        SUM(
                            CASE
                                WHEN a.status IN (
                                    'Present',
                                    'Absent',
                                    'Half Day',
                                    'Late'
                                )
                                THEN 1 ELSE 0
                            END
                        ),
                        0
                    ) AS employee_attendance_rate
                FROM attendance_logs a
                JOIN employees e
                    ON a.employee_id = e.employee_id
                {attendance_where}
                GROUP BY e.employee_id
                HAVING employee_attendance_rate < 0.70
            ) AS low_attendance_employees
        """),
        params,
    ).scalar() or 0

    dropout_rate = (
        round(
            (int(dropout_result) / total_employees) * 100,
            2,
        )
        if total_employees > 0
        else 0
    )

    active_employees = db.execute(
        text(f"""
            SELECT COUNT(*)
            FROM employees
            {employee_where}
            {"AND" if employee_where else "WHERE"} status = 'Active'
        """),
        params,
    ).scalar() or 0

    retention_score = (
        round(
            (int(active_employees) / total_employees) * 100,
            2,
        )
        if total_employees > 0
        else 0
    )

    # --------------------------------------------------
    # KPI calculations
    # --------------------------------------------------

    attendance_rate = (
        round(
            (present_count / working_day_records) * 100,
            2,
        )
        if working_day_records > 0
        else 0
    )

    absenteeism_rate = (
        round(
            (absent_count / working_day_records) * 100,
            2,
        )
        if working_day_records > 0
        else 0
    )

    late_arrival_rate = (
        round(
            (late_count / working_day_records) * 100,
            2,
        )
        if working_day_records > 0
        else 0
    )

    response = {
        "total_employees": total_employees,
        "attendance_records": attendance_records,
        "present": present_count,
        "absent": absent_count,
        "late": late_count,
        "attendance_rate": attendance_rate,
        "absenteeism_rate": absenteeism_rate,
        "late_arrival_rate": late_arrival_rate,
        "average_working_hours": avg_working_hours,
        "total_overtime_hours": total_overtime,
        "workforce_utilization": workforce_utilization,
        "dropout_rate": dropout_rate,
        "employee_retention_score": retention_score,
    }

    db.close()
    return response

@app.get("/analytics/departments")
def department_analytics(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {
            "start_date": start_date,
            "end_date": end_date
        }

        department_filter = ""

        if role == "DEPARTMENT_MANAGER":

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            department_filter = """
                AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)
            """
            params["manager_user_id"] = current_user.get("user_id")

        result = connection.execute(
            text(f"""
                SELECT
                    d.department_name,

                    COUNT(a.attendance_id) AS total_records,

                    SUM(
                        CASE
                            WHEN a.status = 'Present'
                            THEN 1 ELSE 0
                        END
                    ) AS present_count,

                    SUM(
                        CASE
                            WHEN a.status = 'Absent'
                            THEN 1 ELSE 0
                        END
                    ) AS absent_count,

                    SUM(
                        CASE
                            WHEN COALESCE(a.late_minutes, 0) > 0
                            THEN 1 ELSE 0
                        END
                    ) AS late_count,

                    SUM(
                        CASE
                            WHEN a.status IN (
                                'Present',
                                'Absent',
                                'Half Day',
                                'Late'
                            )
                            THEN 1 ELSE 0
                        END
                    ) AS working_day_records,

                    ROUND(
                        SUM(
                            CASE
                                WHEN a.status = 'Present'
                                THEN 1 ELSE 0
                            END
                        )
                        /
                        NULLIF(
                            SUM(
                                CASE
                                    WHEN a.status IN (
                                        'Present',
                                        'Absent',
                                        'Half Day',
                                        'Late'
                                    )
                                    THEN 1 ELSE 0
                                END
                            ),
                            0
                        ) * 100,
                        2
                    ) AS attendance_rate,

                    ROUND(
                        AVG(
                            CASE
                                WHEN a.status NOT IN (
                                    'Weekend',
                                    'Holiday',
                                    'On Leave'
                                )
                                THEN a.working_hours
                                ELSE NULL
                            END
                        ),
                        2
                    ) AS average_working_hours

                FROM attendance_logs a

                JOIN employees e
                    ON a.employee_id = e.employee_id

                JOIN departments d
                    ON e.department_id = d.department_id

                WHERE
                    (:start_date IS NULL
                     OR a.attendance_date >= :start_date)

                    AND
                    (:end_date IS NULL
                     OR a.attendance_date <= :end_date)

                    {department_filter}

                GROUP BY
                    d.department_id,
                    d.department_name

                ORDER BY attendance_rate DESC
            """),
            params
        )

        departments = [
            dict(row._mapping)
            for row in result
        ]

    return departments

@app.get("/analytics/employee-risk")
def employee_risk(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {}
        filters = []

        if start_date:
            filters.append("a.attendance_date >= :start_date")
            params["start_date"] = start_date

        if end_date:
            filters.append("a.attendance_date <= :end_date")
            params["end_date"] = end_date

        if department:
            filters.append("d.department_name = :department")
            params["department"] = department

        # -----------------------------------------
        # DEPARTMENT MANAGER RESTRICTION
        # -----------------------------------------

        if role == "DEPARTMENT_MANAGER":

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            filters.append(
                "e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            )

            params["manager_user_id"] = current_user.get("user_id")

        department_filter = ""
        if filters:
            department_filter = "WHERE " + " AND ".join(filters)

        # -----------------------------------------
        # EMPLOYEE RISK ANALYSIS
        # -----------------------------------------

        result = connection.execute(
            text(f"""
                SELECT
                    e.employee_code,
                    e.employee_name,
                    d.department_name,

                    COUNT(
                        CASE
                            WHEN a.status IN (
                                'Present',
                                'Absent',
                                'Half Day',
                                'Late'
                            )
                            THEN a.attendance_id
                        END
                    ) AS working_day_records,

                    SUM(
                        CASE
                            WHEN a.status = 'Present'
                            THEN 1
                            ELSE 0
                        END
                    ) AS present_count,

                    SUM(
                        CASE
                            WHEN a.status = 'Absent'
                            THEN 1
                            ELSE 0
                        END
                    ) AS absent_count,

                    SUM(
                        CASE
                            WHEN COALESCE(a.late_minutes, 0) > 0
                            THEN 1
                            ELSE 0
                        END
                    ) AS late_count,

                    ROUND(
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN a.status = 'Present'
                                    THEN 1
                                    ELSE 0
                                END
                            )
                            /
                            NULLIF(
                                COUNT(
                                    CASE
                                        WHEN a.status IN (
                                            'Present',
                                            'Absent',
                                            'Half Day',
                                            'Late'
                                        )
                                        THEN a.attendance_id
                                    END
                                ),
                                0
                            )
                            * 100,
                            0
                        ),
                        2
                    ) AS attendance_rate

                FROM employees e

                JOIN departments d
                    ON e.department_id = d.department_id

                LEFT JOIN attendance_logs a
                    ON e.employee_id = a.employee_id

                {department_filter}

                GROUP BY
                    e.employee_id,
                    e.employee_code,
                    e.employee_name,
                    d.department_name

                ORDER BY attendance_rate ASC
            """),
            params
        )

        employees = []

        for row in result:

            data = dict(row._mapping)

            attendance_rate = float(
                data["attendance_rate"] or 0
            )

            absent_count = int(
                data["absent_count"] or 0
            )

            late_count = int(
                data["late_count"] or 0
            )

            # -----------------------------------------
            # RISK CLASSIFICATION
            # -----------------------------------------

            if (
                attendance_rate < 60
                or absent_count >= 3
            ):
                risk_level = "High"

            elif (
                attendance_rate < 80
                or late_count >= 3
            ):
                risk_level = "Medium"

            else:
                risk_level = "Low"

            data["risk_level"] = risk_level

            employees.append(data)

    return employees
@app.get("/analytics/anomalies")
def attendance_anomalies(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {
            "start_date": start_date,
            "end_date": end_date
        }

        department_filter = ""

        if role == "DEPARTMENT_MANAGER":
            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            department_filter = """
                AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)
            """
            params["manager_user_id"] = current_user.get("user_id")

        result = connection.execute(
            text(f"""
                SELECT
                    a.attendance_id,
                    e.employee_code,
                    e.employee_name,
                    d.department_name,
                    a.attendance_date,
                    a.status,
                    a.working_hours,
                    a.overtime_hours,
                    a.late_minutes

                FROM attendance_logs a

                JOIN employees e
                    ON a.employee_id = e.employee_id

                JOIN departments d
                    ON e.department_id = d.department_id

                WHERE
                    (:start_date IS NULL
                     OR a.attendance_date >= :start_date)

                    AND
                    (:end_date IS NULL
                     OR a.attendance_date <= :end_date)

                    {department_filter}

                ORDER BY a.attendance_date DESC
            """),
            params
        )

        anomalies = []

        for row in result:
            data = dict(row._mapping)
            reasons = []

            if (
                data["working_hours"] is not None
                and float(data["working_hours"]) < 4
            ):
                reasons.append("Unusually low working hours")

            if (
                data["late_minutes"] is not None
                and float(data["late_minutes"]) >= 30
            ):
                reasons.append("Significantly late arrival")

            if (
                data["overtime_hours"] is not None
                and float(data["overtime_hours"]) >= 4
            ):
                reasons.append("Unusually high overtime")

            if data["status"] == "Absent":
                reasons.append("Absence recorded")

            if reasons:
                data["anomaly_reasons"] = reasons
                data["anomaly_level"] = (
                    "High"
                    if len(reasons) >= 2
                    else "Medium"
                )

                anomalies.append(data)

    return {
        "total_anomalies": len(anomalies),
        "anomalies": anomalies
    }
@app.get(
    "/analytics/trends",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def attendance_trends(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    current_user=Depends(get_current_user),
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        query = """
            SELECT
                a.attendance_date,
                COUNT(*) AS total_records,

                SUM(
                    CASE
                        WHEN a.status = 'Present'
                        THEN 1 ELSE 0
                    END
                ) AS present_count,

                SUM(
                    CASE
                        WHEN a.status = 'Absent'
                        THEN 1 ELSE 0
                    END
                ) AS absent_count,

                SUM(
                    CASE
                        WHEN COALESCE(a.late_minutes, 0) > 0
                        THEN 1 ELSE 0
                    END
                ) AS late_count,

                SUM(
                    CASE
                        WHEN a.status IN (
                            'Present',
                            'Absent',
                            'Half Day',
                            'Late'
                        )
                        THEN 1 ELSE 0
                    END
                ) AS working_day_records,

                ROUND(
                    SUM(
                        CASE
                            WHEN a.status = 'Present'
                            THEN 1 ELSE 0
                        END
                    )
                    /
                    NULLIF(
                        SUM(
                            CASE
                                WHEN a.status IN (
                                    'Present',
                                    'Absent',
                                    'Half Day',
                                    'Late'
                                )
                                THEN 1 ELSE 0
                            END
                        ),
                        0
                    ) * 100,
                    2
                ) AS attendance_rate

            FROM attendance_logs a

            JOIN employees e
                ON a.employee_id = e.employee_id

            WHERE 1=1
        """

        params = {}

        if start_date:
            query += """
                AND a.attendance_date >= :start_date
            """
            params["start_date"] = start_date

        if end_date:
            query += """
                AND a.attendance_date <= :end_date
            """
            params["end_date"] = end_date

        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            query += """
                AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)
            """
            params["manager_user_id"] = current_user.get("user_id")

        query += """
            GROUP BY a.attendance_date
            ORDER BY a.attendance_date
        """

        result = connection.execute(
            text(query),
            params
        )

        trends = [
            dict(row._mapping)
            for row in result
        ]

    return trends
# =========================
# ATTENDANCE FORECAST
# =========================

@app.get(
    "/analytics/forecast",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def attendance_forecast(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):

    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {}
        filters = []

        # -------------------------------------------------
        # DATE FILTER
        # -------------------------------------------------

        if start_date:
            filters.append(
                "a.attendance_date >= :start_date"
            )
            params["start_date"] = start_date

        if end_date:
            filters.append(
                "a.attendance_date <= :end_date"
            )
            params["end_date"] = end_date

        # -------------------------------------------------
        # DEPARTMENT MANAGER RESTRICTION
        # -------------------------------------------------

        if role == "DEPARTMENT_MANAGER":

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            filters.append(
                "e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            )

            params["manager_user_id"] = current_user.get("user_id")

        # -------------------------------------------------
        # DEPARTMENT FILTER
        # -------------------------------------------------

        elif department:

            filters.append(
                "d.department_name = :department"
            )

            params["department"] = department

        where_clause = ""

        if filters:
            where_clause = (
                "WHERE " + " AND ".join(filters)
            )

        # -------------------------------------------------
        # GET HISTORICAL ATTENDANCE
        # -------------------------------------------------

        result = connection.execute(
            text(f"""
                SELECT
                    a.attendance_date,

                    COUNT(a.attendance_id)
                        AS total_records,

                    SUM(
                        CASE
                            WHEN a.status = 'Present'
                            THEN 1
                            ELSE 0
                        END
                    ) AS present_count

                FROM attendance_logs a

                JOIN employees e
                    ON a.employee_id = e.employee_id

                JOIN departments d
                    ON e.department_id = d.department_id

                {where_clause}

                GROUP BY a.attendance_date

                ORDER BY a.attendance_date
            """),
            params
        )

        historical = [
            dict(row._mapping)
            for row in result
        ]

    # -------------------------------------------------
    # CALCULATE CURRENT ATTENDANCE RATE
    # -------------------------------------------------

    rates = []

    for row in historical:

        total = int(
            row["total_records"] or 0
        )

        present = int(
            row["present_count"] or 0
        )

        if total > 0:
            rates.append(
                (present / total) * 100
            )

    # -------------------------------------------------
    # SIMPLE FORECAST
    # -------------------------------------------------

    if not rates:

        predicted_rate = 0

        status = "Insufficient historical data"

    else:

        # Use recent attendance performance
        recent_rates = rates[-7:]

        predicted_rate = (
            sum(recent_rates)
            / len(recent_rates)
        )

        predicted_rate = round(
            predicted_rate,
            2
        )

        if predicted_rate >= 85:
            status = "Healthy"

        elif predicted_rate >= 70:
            status = "Moderate"

        else:
            status = "At Risk"

    return {
        "predicted_attendance_rate":
            predicted_rate,

        "forecast_period":
            "Next Period",

        "status":
            status,

        "historical_days":
            len(historical),

        "method":
            "Recent 7-day attendance average"
    }
# =========================
# LEAVE MANAGEMENT
# =========================

@app.get("/leaves")
def get_leaves(
    current_user=Depends(get_current_user)
):
    employee_id = current_user.get("employee_id")
    role = current_user.get("role")

    with engine.connect() as connection:

        if role == "EMPLOYEE":

            result = connection.execute(
                text("""
                    SELECT
                        l.leave_id,
                        e.employee_code,
                        e.employee_name,
                        l.leave_date,
                        l.leave_type,
                        l.status,
                        l.reason
                    FROM leaves l
                    JOIN employees e
                        ON l.employee_id = e.employee_id
                    WHERE l.employee_id = :employee_id
                    ORDER BY l.leave_date DESC
                """),
                {
                    "employee_id": employee_id
                }
            )

        elif role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            result = connection.execute(
                text("""
                    SELECT
                        l.leave_id,
                        e.employee_code,
                        e.employee_name,
                        l.leave_date,
                        l.leave_type,
                        l.status,
                        l.reason
                    FROM leaves l
                    JOIN employees e
                        ON l.employee_id = e.employee_id
                    WHERE e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)
                    ORDER BY l.leave_date DESC
                """),
                {
                    "manager_user_id": current_user.get("user_id")
                }
            )

        else:

            result = connection.execute(
                text("""
                    SELECT
                        l.leave_id,
                        e.employee_code,
                        e.employee_name,
                        l.leave_date,
                        l.leave_type,
                        l.status,
                        l.reason
                    FROM leaves l
                    JOIN employees e
                        ON l.employee_id = e.employee_id
                    ORDER BY l.leave_date DESC
                """)
            )

        leaves = [
            dict(row._mapping)
            for row in result
        ]

    return leaves

@app.post("/leaves")
async def apply_leave(
    leave_date: str,
    leave_type: str = "Casual",
    reason: str = "",
    current_user=Depends(get_current_user)
):
    employee_id = current_user.get("employee_id")

    try:
        requested_date = date.fromisoformat(leave_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid leave date. Use YYYY-MM-DD format."
        )

    if requested_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Leave cannot be applied for a past date."
        )

    if employee_id is None:
        raise HTTPException(
            status_code=400,
            detail="This account is not linked to an employee"
        )
    with engine.begin() as connection:

        # Get employee details from the authenticated user
        employee_result = connection.execute(
            text("""
                SELECT employee_code, employee_name
                FROM employees
                WHERE employee_id = :employee_id
            """),
            {
                "employee_id": employee_id
            }
        ).mappings().first()

        if employee_result is None:
            raise HTTPException(
                status_code=404,
                detail="Employee record not found"
            )

        # Check duplicate leave
        existing_leave = connection.execute(
            text("""
                SELECT leave_id
                FROM leaves
                WHERE employee_id = :employee_id
                  AND leave_date = :leave_date
            """),
            {
                "employee_id": employee_id,
                "leave_date": leave_date
            }
        ).scalar()

        if existing_leave is not None:
            raise HTTPException(
                status_code=400,
                detail="Leave already exists for this employee on this date."
            )

        # Insert leave
        connection.execute(
            text("""
                INSERT INTO leaves (
                    employee_id,
                    leave_date,
                    leave_type,
                    status,
                    reason
                )
                VALUES (
                    :employee_id,
                    :leave_date,
                    :leave_type,
                    'Pending',
                    :reason
                )
            """),
            {
                "employee_id": employee_id,
                "leave_date": leave_date,
                "leave_type": leave_type,
                "reason": reason
            }
        )
    await dashboard_manager.broadcast({
        "event": "dashboard_updated",
        "message": "A new leave application has been submitted.",
        "leave_date": leave_date,
        "status": "Pending"
    })
    return {
        "message": "Leave application submitted successfully",
        "employee_code": employee_result["employee_code"],
        "employee_name": employee_result["employee_name"],
        "leave_date": leave_date,
        "status": "Pending"
    }
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DATA_ANALYST"
    ))
):
    upload_folder = "data/uploads"

    os.makedirs(upload_folder, exist_ok=True)

    safe_filename = os.path.basename(file.filename)

    if safe_filename in ("", ".", ".."):
        raise HTTPException(
            status_code=400,
            detail="Invalid filename"
        )

    file_path = os.path.join(upload_folder, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        log_audit_event(
            action="FILE_UPLOAD",
            module="DATA_UPLOAD",
            user_id=current_user.get("user_id"),
            resource="FILE",
            resource_id=file.filename,
            new_values={
                "filename": file.filename
            },
            status="SUCCESS",
        )

        df = process_attendance_file(file_path)

        log_audit_event(
            action="FILE_VALIDATED",
            module="DATA_UPLOAD",
            user_id=current_user.get("user_id"),
            resource="FILE",
            resource_id=file.filename,
            status="SUCCESS",
        )

        upload_stats = load_attendance_to_database(df)

        log_audit_event(
            action="FILE_PROCESSED",
            module="DATA_UPLOAD",
            user_id=current_user.get("user_id"),
            resource="FILE",
            resource_id=file.filename,
            new_values={
    "records_received": upload_stats["records_received"],
    "records_inserted": upload_stats["inserted"],
    "duplicates_skipped": upload_stats["duplicates_skipped"],
},
            status="SUCCESS",
        )

        await dashboard_manager.broadcast({
    "event": "dashboard_updated",
    "message": "New attendance data has been uploaded and processed.",
    "filename": file.filename,
    "records_received": upload_stats["records_received"],
    "records_inserted": upload_stats["inserted"],
    "duplicates_skipped": upload_stats["duplicates_skipped"],
})

        return {
    "message": "File uploaded and processed successfully",
    "filename": file.filename,
    "records_received": upload_stats["records_received"],
    "records_inserted": upload_stats["inserted"],
    "duplicates_skipped": upload_stats["duplicates_skipped"],
}

    except Exception as e:

        log_audit_event(
            action="FILE_REJECTED",
            module="DATA_UPLOAD",
            user_id=current_user.get("user_id"),
            resource="FILE",
            resource_id=file.filename,
            status="FAILED",
            error_message=str(e),
        )

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    # ============================================================
# SRS DATA UPLOAD API ALIASES
# ============================================================
# Add this block immediately AFTER the existing @app.post("/upload")
# function and BEFORE the next endpoint (currently /analytics/leave).
#
# These endpoints preserve the existing working /upload endpoint and
# add the exact SRS API contract:
#   POST   /api/upload/attendance
#   GET    /api/upload/history
#   GET    /api/upload/{id}/status
#   DELETE /api/upload/{id}

UPLOAD_API_ROLES = (
    "SUPER_ADMIN",
    "HR_MANAGER",
    "DATA_ANALYST",
)


@app.post(
    "/api/upload/attendance",
    dependencies=[Depends(require_role(*UPLOAD_API_ROLES))]
)
async def upload_attendance_srs(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    # Reuse the existing, already-tested upload/ETL implementation.
    return await upload_file(file=file, current_user=current_user)


@app.get(
    "/api/upload/history",
    dependencies=[Depends(require_role(*UPLOAD_API_ROLES))]
)
def upload_history():
    upload_folder = "data/uploads"
    os.makedirs(upload_folder, exist_ok=True)

    records = []

    for filename in os.listdir(upload_folder):
        file_path = os.path.join(upload_folder, filename)

        if not os.path.isfile(file_path):
            continue

        stat = os.stat(file_path)

        records.append({
            "id": filename,
            "filename": filename,
            "status": "PROCESSED",
            "size_bytes": stat.st_size,
            "uploaded_at": datetime.fromtimestamp(
                stat.st_mtime
            ).isoformat(),
        })

    records.sort(
        key=lambda row: row["uploaded_at"],
        reverse=True
    )

    return {
        "uploads": records,
        "total": len(records),
    }


@app.get(
    "/api/upload/{id}/status",
    dependencies=[Depends(require_role(*UPLOAD_API_ROLES))]
)
def upload_status(id: str):
    filename = os.path.basename(id)

    if filename != id or filename in ("", ".", ".."):
        raise HTTPException(
            status_code=400,
            detail="Invalid upload ID"
        )

    file_path = os.path.join("data/uploads", filename)

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="Uploaded file not found"
        )

    stat = os.stat(file_path)

    return {
        "id": filename,
        "filename": filename,
        "status": "PROCESSED",
        "size_bytes": stat.st_size,
        "uploaded_at": datetime.fromtimestamp(
            stat.st_mtime
        ).isoformat(),
    }


@app.delete(
    "/api/upload/{id}",
    dependencies=[Depends(require_role(*UPLOAD_API_ROLES))]
)
def delete_uploaded_file(
    id: str,
    current_user=Depends(get_current_user),
):
    filename = os.path.basename(id)

    if filename != id or filename in ("", ".", ".."):
        raise HTTPException(
            status_code=400,
            detail="Invalid upload ID"
        )

    file_path = os.path.join("data/uploads", filename)

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="Uploaded file not found"
        )

    try:
        os.remove(file_path)

        log_audit_event(
            action="FILE_DELETED",
            module="DATA_UPLOAD",
            user_id=current_user.get("user_id"),
            resource="FILE",
            resource_id=filename,
            old_values={"filename": filename},
            status="SUCCESS",
        )

        return {
            "message": "Uploaded file deleted successfully",
            "id": filename,
            "filename": filename,
        }

    except Exception as exc:
        log_audit_event(
            action="FILE_DELETE_FAILED",
            module="DATA_UPLOAD",
            user_id=current_user.get("user_id"),
            resource="FILE",
            resource_id=filename,
            status="FAILED",
            error_message=str(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to delete uploaded file"
        )

@app.get(
    "/analytics/leave",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def leave_analytics(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {}
        filters = []

        if start_date:
            filters.append("l.leave_date >= :start_date")
            params["start_date"] = start_date

        if end_date:
            filters.append("l.leave_date <= :end_date")
            params["end_date"] = end_date

        if department:
            filters.append("d.department_name = :department")
            params["department"] = department

        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            filters.append(
                "e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            )
            params["manager_user_id"] = current_user.get("user_id")

        where_clause = ""
        if filters:
            where_clause = " AND " + " AND ".join(filters)

        result = connection.execute(
            text(f"""
                SELECT
    l.leave_type,
    COUNT(*) AS count,
    COUNT(*) AS total_days
                FROM leaves l
                JOIN employees e
                    ON l.employee_id = e.employee_id
                JOIN departments d
                    ON e.department_id = d.department_id
                WHERE 1=1
                    {where_clause}
                GROUP BY l.leave_type
                ORDER BY count DESC
            """),
            params
        )

        analytics = [
            dict(row._mapping)
            for row in result
        ]

    return analytics
@app.get(
    "/analytics/overtime",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def overtime_analytics(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {}
        filters = []

        if start_date:
            filters.append("a.attendance_date >= :start_date")
            params["start_date"] = start_date

        if end_date:
            filters.append("a.attendance_date <= :end_date")
            params["end_date"] = end_date

        if department:
            filters.append("d.department_name = :department")
            params["department"] = department

        department_filter = ""

        # Department Managers may only see overtime
        # belonging to their own department.
        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            filters.append(
                "e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            )
            params["manager_user_id"] = current_user.get("user_id")

        if filters:
            department_filter = "WHERE " + " AND ".join(filters)

        result = connection.execute(
            text(f"""
                SELECT
                    e.employee_code,
                    e.employee_name,
                    d.department_name,
                    ROUND(SUM(a.overtime_hours), 2)
                        AS total_overtime_hours,
                    ROUND(AVG(a.overtime_hours), 2)
                        AS average_overtime_hours
                FROM attendance_logs a
                JOIN employees e
                    ON a.employee_id = e.employee_id
                JOIN departments d
                    ON e.department_id = d.department_id
                {department_filter}
                GROUP BY
                    e.employee_id,
                    e.employee_code,
                    e.employee_name,
                    d.department_id,
                    d.department_name
                ORDER BY total_overtime_hours DESC
            """),
            params
        )

        return [
            dict(row._mapping)
            for row in result
        ]

# =========================
# EMPLOYEE ANALYTICS
# =========================

@app.get(
    "/analytics/employee",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def employee_analytics(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        params = {}
        filters = []

        # -------------------------------------------------
        # DATE FILTER
        # -------------------------------------------------

        if start_date:
            filters.append(
                "a.attendance_date >= :start_date"
            )
            params["start_date"] = start_date

        if end_date:
            filters.append(
                "a.attendance_date <= :end_date"
            )
            params["end_date"] = end_date

        # -------------------------------------------------
        # DEPARTMENT MANAGER RESTRICTION
        # -------------------------------------------------

        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            filters.append(
                "e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            )

            params["manager_user_id"] = current_user.get("user_id")

            # Prevent manager from requesting another department
            if department:

                requested_department = connection.execute(
                    text("""
                        SELECT department_id
                        FROM departments
                        WHERE department_name = :department
                    """),
                    {
                        "department": department
                    }
                ).scalar()

                if requested_department not in manager_department_ids:
                    raise HTTPException(
                        status_code=403,
                        detail="You can only access employee analytics for your own department"
                    )

        # -------------------------------------------------
        # DEPARTMENT FILTER
        # -------------------------------------------------

        elif department:

            filters.append(
                "d.department_name = :department"
            )

            params["department"] = department

        # -------------------------------------------------
        # BUILD WHERE CLAUSE
        # -------------------------------------------------

        where_clause = ""

        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        # -------------------------------------------------
        # EMPLOYEE ANALYTICS QUERY
        # -------------------------------------------------

        result = connection.execute(
            text(f"""
                SELECT

                    e.employee_code,
                    e.employee_name,
                    d.department_name,

                    COUNT(a.attendance_id)
                        AS total_records,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN a.status = 'Present'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS present_count,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN a.status = 'Absent'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS absent_count,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN COALESCE(a.late_minutes, 0) > 0
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS late_count,

                    ROUND(
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN a.status = 'Present'
                                    THEN 1
                                    ELSE 0
                                END
                            )
                            /
                            NULLIF(
                                SUM(
                                    CASE
                                        WHEN a.status NOT IN (
                                            'Weekend',
                                            'Holiday',
                                            'On Leave'
                                        )
                                        THEN 1
                                        ELSE 0
                                    END
                                ),
                                0
                            )
                            * 100,
                            0
                        ),
                        2
                    ) AS attendance_rate,

                    ROUND(
                        COALESCE(
                            AVG(a.working_hours),
                            0
                        ),
                        2
                    ) AS average_working_hours,

                    ROUND(
                        COALESCE(
                            SUM(a.overtime_hours),
                            0
                        ),
                        2
                    ) AS total_overtime_hours,

                    COALESCE(
                        SUM(a.late_minutes),
                        0
                    ) AS total_late_minutes

                FROM employees e

                JOIN departments d
                    ON e.department_id = d.department_id

                LEFT JOIN attendance_logs a
                    ON e.employee_id = a.employee_id

                {where_clause}

                GROUP BY
                    e.employee_id,
                    e.employee_code,
                    e.employee_name,
                    d.department_name

                ORDER BY attendance_rate ASC
            """),
            params
        )

        employees = []

        for row in result:

            data = dict(row._mapping)

            attendance_rate = float(
                data["attendance_rate"] or 0
            )

            absent_count = int(
                data["absent_count"] or 0
            )

            late_count = int(
                data["late_count"] or 0
            )

            # -------------------------------------------------
            # EMPLOYEE RISK
            # -------------------------------------------------

            if (
                attendance_rate < 60
                or absent_count >= 3
            ):
                risk_level = "High"

            elif (
                attendance_rate < 80
                or late_count >= 3
            ):
                risk_level = "Medium"

            else:
                risk_level = "Low"

            data["risk_level"] = risk_level

            employees.append(data)

    return employees
@app.put("/leaves/{leave_id}")
async def update_leave_status(
    leave_id: int,
    status: str,
    current_user=Depends(require_role(
        "HR_MANAGER",
        "DEPARTMENT_MANAGER"
    ))
):
    if status not in {"Approved", "Rejected"}:
        raise HTTPException(
            status_code=400,
            detail="Status must be Approved or Rejected"
        )

    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.begin() as connection:

        # Get the leave and the employee's department
        leave_result = connection.execute(
            text("""
                SELECT
                    l.leave_id,
                    l.employee_id,
                    l.status,
                    e.department_id
                FROM leaves l
                JOIN employees e
                    ON l.employee_id = e.employee_id
                WHERE l.leave_id = :leave_id
            """),
            {
                "leave_id": leave_id
            }
        ).mappings().first()

        if leave_result is None:
            raise HTTPException(
                status_code=404,
                detail="Leave record not found"
            )

        # Department Managers can only manage leaves
        # belonging to their own department
        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            if leave_result["department_id"] not in manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You can only manage leaves from your own department"
                )

        # Prevent changing an already finalized leave
        if leave_result["status"] != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Only pending leave applications can be updated"
            )

        # Update leave status
        connection.execute(
            text("""
                UPDATE leaves
                SET status = :status
                WHERE leave_id = :leave_id
            """),
            {
                "status": status,
                "leave_id": leave_id
            }
        )

    # Notify connected dashboards
    await dashboard_manager.broadcast({
        "event": "dashboard_updated",
        "message": "Leave status has been updated.",
        "leave_id": leave_id,
        "status": status
    })

    return {
        "message": "Leave status updated successfully",
        "leave_id": leave_id,
        "status": status
    }
# =========================
# HOLIDAY MANAGEMENT
# =========================

class HolidayCreate(BaseModel):
    holiday_date: str
    holiday_name: str
    description: str | None = None


@app.get("/holidays")
def get_holidays(
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE",
        "EMPLOYEE"
    ))
):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    holiday_id,
                    holiday_date,
                    holiday_name,
                    description
                FROM holidays
                ORDER BY holiday_date
            """)
        )

        holidays = [
            dict(row._mapping)
            for row in result
        ]

    return holidays


@app.post("/holidays")
def create_holiday(
    holiday: HolidayCreate,
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER"
    ))
):
    with engine.begin() as connection:

        existing = connection.execute(
            text("""
                SELECT holiday_id
                FROM holidays
                WHERE holiday_date = :holiday_date
            """),
            {
                "holiday_date": holiday.holiday_date
            }
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Holiday already exists for this date"
            )

        result = connection.execute(
            text("""
                INSERT INTO holidays
                (
                    holiday_date,
                    holiday_name,
                    description
                )
                VALUES
                (
                    :holiday_date,
                    :holiday_name,
                    :description
                )
            """),
            {
                "holiday_date": holiday.holiday_date,
                "holiday_name": holiday.holiday_name,
                "description": holiday.description
            }
        )

        holiday_id = result.lastrowid

        return {
        "holiday_id": holiday_id,
        "holiday_date": str(holiday.holiday_date),
        "holiday_name": holiday.holiday_name,
        "description": holiday.description or ""
    }


@app.put("/holidays/{holiday_id}")
def update_holiday(
    holiday_id: int,
    holiday: HolidayCreate, 
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER"
    ))
):
    with engine.begin() as connection:

        result = connection.execute(
            text("""
                UPDATE holidays
                SET
                    holiday_date = :holiday_date,
                    holiday_name = :holiday_name,
                    description = :description
                WHERE holiday_id = :holiday_id
            """),
            {
                "holiday_date": holiday.holiday_date,
                "holiday_name": holiday.holiday_name,
                "description": holiday.description,
                "holiday_id": holiday_id
            }
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Holiday not found"
            )

    return {
        "message": "Holiday updated successfully"
    }


@app.delete("/holidays/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    current_user=Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER"
    ))
):
    with engine.begin() as connection:

        # Check that the holiday exists
        existing = connection.execute(
            text("""
                SELECT holiday_id
                FROM holidays
                WHERE holiday_id = :holiday_id
            """),
            {
                "holiday_id": holiday_id
            }
        ).first()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Holiday not found"
            )

        # Delete the holiday
        connection.execute(
            text("""
                DELETE FROM holidays
                WHERE holiday_id = :holiday_id
            """),
            {
                "holiday_id": holiday_id
            }
        )

    return {
        "message": "Holiday deleted successfully",
        "holiday_id": holiday_id
    }
# =========================
# REPORTS
# =========================

@app.get(
    "/api/reports/attendance",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def attendance_report(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    role = current_user.get("role")
    employee_id = current_user.get("employee_id")

    with engine.connect() as connection:

        query = """
            SELECT
                e.employee_code,
                e.employee_name,
                d.department_name,
                a.attendance_date,
                a.status,
                a.login_time,
                a.logout_time,
                a.working_hours,
                a.overtime_hours,
                a.late_minutes
            FROM attendance_logs a
            JOIN employees e
                ON a.employee_id = e.employee_id
            JOIN departments d
                ON e.department_id = d.department_id
            WHERE 1=1
        """

        params = {}

        if start_date:
            query += " AND a.attendance_date >= :start_date"
            params["start_date"] = start_date

        if end_date:
            query += " AND a.attendance_date <= :end_date"
            params["end_date"] = end_date

        # Department Managers can only access their own department
        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            manager_department_ids = get_manager_department_ids(
                connection, current_user
            )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if not manager_department_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Manager employee record not found"
                )

            query += " AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            params["manager_user_id"] = current_user.get("user_id")

            # Prevent manager from requesting another department
            if department:
                requested_department = connection.execute(
                    text("""
                        SELECT department_id
                        FROM departments
                        WHERE department_name = :department
                    """),
                    {
                        "department": department
                    }
                ).scalar()

                if requested_department not in manager_department_ids:
                    raise HTTPException(
                        status_code=403,
                        detail="You can only access reports for your own department"
                    )

        elif department:
            query += " AND d.department_name = :department"
            params["department"] = department

        query += """
            ORDER BY
                a.attendance_date,
                e.employee_code
        """

        result = connection.execute(
            text(query),
            params
        )

        records = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "report_type": "Attendance Report",
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "department": department
        },
        "total_records": len(records),
        "records": records
    }
# =========================
# DAILY REPORT
# =========================

@app.get(
    "/api/reports/daily",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def daily_report(
    report_date: str,
    department: str | None = None,
    current_user=Depends(get_current_user)
):
    return attendance_report(
    start_date=report_date,
    end_date=report_date,
    department=department,
    current_user=current_user
)
# =========================
# WEEKLY REPORT
# =========================

@app.get(
    "/api/reports/weekly",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def weekly_report(
    start_date: str = Query(...),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    from datetime import datetime, timedelta

    try:
        start = datetime.strptime(
            start_date,
            "%Y-%m-%d"
        ).date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid start_date. Use YYYY-MM-DD format."
        )

    end = start + timedelta(days=6)

    return attendance_report(
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        department=department,
        current_user=current_user
    )

# =========================
# MONTHLY REPORT
# =========================

@app.get(
    "/api/reports/monthly",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def monthly_report(
    year: int = Query(...),
    month: int = Query(...),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    from calendar import monthrange

    if month < 1 or month > 12:
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12."
        )

    if year < 2000 or year > 2100:
        raise HTTPException(
            status_code=400,
            detail="Invalid year."
        )

    start_date = f"{year:04d}-{month:02d}-01"

    last_day = monthrange(year, month)[1]

    end_date = (
        f"{year:04d}-{month:02d}-{last_day:02d}"
    )

    return attendance_report(
        start_date=start_date,
        end_date=end_date,
        department=department,
        current_user=current_user
    )
# =========================
# CUSTOM REPORT
# =========================

@app.get(
    "/api/reports/custom",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def custom_report(
    start_date: str = Query(...),
    end_date: str = Query(...),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):
    return attendance_report(
        start_date=start_date,
        end_date=end_date,
        department=department,
        current_user=current_user
    )
@app.get(
    "/api/reports/export/excel",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def export_attendance_excel(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):

    report = attendance_report(
        start_date=start_date,
        end_date=end_date,
        department=department,
        current_user=current_user
    )

    records = report.get("records", [])

    df = pd.DataFrame(records)

    output = BytesIO()

    with pd.ExcelWriter(
        output,
        engine="openpyxl"
    ) as writer:

        df.to_excel(
            writer,
            index=False,
            sheet_name="Attendance Report"
        )

    output.seek(0)

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
                "attachment; filename=attendance_report.xlsx"
        }
    )
@app.get(
    "/api/reports/export/pdf",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "DATA_ANALYST",
        "EXECUTIVE"
    ))]
)
def export_attendance_pdf(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user)
):

    report = attendance_report(
        start_date=start_date,
        end_date=end_date,
        department=department,
        current_user=current_user
    )

    records = report.get("records", [])

    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=25,
        leftMargin=25,
        topMargin=25,
        bottomMargin=25,
    )

    styles = getSampleStyleSheet()

    elements = []

    elements.append(
        Paragraph(
            "Attendance Report",
            styles["Title"]
        )
    )

    elements.append(Spacer(1, 12))

    elements.append(
        Paragraph(
            f"Total Records: {len(records)}",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1, 12))

    table_data = [[
        "Employee Code",
        "Employee",
        "Department",
        "Date",
        "Status",
        "Check In",
        "Check Out",
        "Hours",
        "Overtime",
        "Late Minutes",
    ]]

    for item in records:

        table_data.append([
            item.get("employee_code", ""),
            item.get("employee_name", ""),
            item.get("department_name", ""),
            item.get("attendance_date", ""),
            item.get("status", ""),
            item.get("login_time", ""),
            item.get("logout_time", ""),
            item.get("working_hours", 0),
            item.get("overtime_hours", 0),
            item.get("late_minutes", 0),
        ])

    table = Table(
        table_data,
        repeatRows=1
    )

    table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.lightgrey
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.black
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),
        ])
    )

    elements.append(table)

    document.build(elements)

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                "attachment; filename=attendance_report.pdf"
        }
    )
# =========================
# AI INSIGHTS
# =========================

AI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
_latest_ai_insights = None

AI_ROLES = (
    "SUPER_ADMIN",
    "HR_MANAGER",
    "DEPARTMENT_MANAGER",
    "DATA_ANALYST",
    "EXECUTIVE",
)


def _risk_level(attendance_rate, absenteeism_rate, late_arrival_rate):
    """Apply the SRS department-risk scoring rules."""
    risk_score = 0

    if attendance_rate < 75:
        risk_score += 40
    elif attendance_rate < 85:
        risk_score += 20

    if absenteeism_rate > 20:
        risk_score += 40
    elif absenteeism_rate > 15:
        risk_score += 20

    if late_arrival_rate > 15:
        risk_score += 20
    elif late_arrival_rate > 10:
        risk_score += 10

    if risk_score >= 70:
        return "High Risk", risk_score
    if risk_score >= 40:
        return "Medium Risk", risk_score
    return "Low Risk", risk_score


def _collect_ai_metrics(
    start_date=None,
    end_date=None,
    department=None,
    allowed_department_ids=None,
    manager_user_id=None
):
    """Collect the attendance metrics required by the AI prompt strategy."""
    date_filter = ""
    params = {}

    if start_date:
        date_filter += " AND a.attendance_date >= :start_date"
        params["start_date"] = start_date
    if end_date:
        date_filter += " AND a.attendance_date <= :end_date"
        params["end_date"] = end_date
    if department:
        date_filter += " AND d.department_name = :department"
        params["department"] = department
    if allowed_department_ids:
        date_filter += " AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
        params["manager_user_id"] = manager_user_id

    with engine.connect() as connection:
        summary_row = connection.execute(
            text(f"""
                SELECT
                    COUNT(*) AS total_records,
                    COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present_count,
                    COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END), 0) AS absent_count,
                    COALESCE(SUM(CASE WHEN COALESCE(a.late_minutes, 0) > 0 THEN 1 ELSE 0 END), 0) AS late_count,
                    COALESCE(AVG(
                        CASE
                            WHEN a.status NOT IN ('Weekend', 'Holiday', 'On Leave')
                            THEN a.working_hours
                            ELSE NULL
                        END
                    ), 0) AS average_working_hours,
                    COALESCE(SUM(
                        CASE
                            WHEN a.status NOT IN ('Weekend', 'Holiday', 'On Leave')
                            THEN COALESCE(a.overtime_hours, 0)
                            ELSE 0
                        END
                    ), 0) AS total_overtime_hours
                FROM attendance_logs a
                JOIN employees e ON a.employee_id = e.employee_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE 1=1 {date_filter}
            """),
            params,
        ).mappings().first()

        total_records = int(summary_row["total_records"] or 0)
        present_count = int(summary_row["present_count"] or 0)
        absent_count = int(summary_row["absent_count"] or 0)
        late_count = int(summary_row["late_count"] or 0)

        working_day_result = connection.execute(
            text(f"""
                SELECT COUNT(*)
                FROM attendance_logs a
                JOIN employees e ON a.employee_id = e.employee_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE 1=1 {date_filter}
                  AND a.status IN ('Present', 'Absent', 'Half Day', 'Late')
            """),
            params,
        ).scalar() or 0

        working_day_records = int(working_day_result)

        attendance_rate = round((present_count / working_day_records) * 100, 2) if working_day_records else 0
        absenteeism_rate = round((absent_count / working_day_records) * 100, 2) if working_day_records else 0
        late_arrival_rate = round((late_count / working_day_records) * 100, 2) if working_day_records else 0

        department_rows = connection.execute(
            text(f"""
                SELECT
                    d.department_name,
                    COUNT(a.attendance_id) AS total_records,
                    COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present_count,
                    COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END), 0) AS absent_count,
                    COALESCE(SUM(CASE WHEN COALESCE(a.late_minutes, 0) > 0 THEN 1 ELSE 0 END), 0) AS late_count,
                   ROUND(
    COALESCE(
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
        / NULLIF(
            SUM(
                CASE
                    WHEN a.status IN ('Present', 'Absent', 'Half Day', 'Late')
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) * 100,
        0
    ),
    2
) AS attendance_rate,

ROUND(
    COALESCE(
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END)
        / NULLIF(
            SUM(
                CASE
                    WHEN a.status IN ('Present', 'Absent', 'Half Day', 'Late')
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) * 100,
        0
    ),
    2
) AS absenteeism_rate,

ROUND(
    COALESCE(
        SUM(
            CASE
                WHEN COALESCE(a.late_minutes, 0) > 0
                THEN 1
                ELSE 0
            END
        )
        / NULLIF(
            SUM(
                CASE
                    WHEN a.status IN ('Present', 'Absent', 'Half Day', 'Late')
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) * 100,
        0
    ),
    2
) AS late_arrival_rate,
                    ROUND(COALESCE(AVG(a.working_hours), 0), 2) AS average_working_hours,
                    ROUND(COALESCE(SUM(a.overtime_hours), 0), 2) AS total_overtime_hours
                FROM attendance_logs a
                JOIN employees e ON a.employee_id = e.employee_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE 1=1 {date_filter}
                GROUP BY d.department_id, d.department_name
                ORDER BY attendance_rate ASC
            """),
            params,
        ).mappings().all()

        departments = []
        for row in department_rows:
            risk, risk_score = _risk_level(
                float(row["attendance_rate"] or 0),
                float(row["absenteeism_rate"] or 0),
                float(row["late_arrival_rate"] or 0),
            )
            departments.append({
                "department": row["department_name"],
                "attendance_rate": float(row["attendance_rate"] or 0),
                "absenteeism_rate": float(row["absenteeism_rate"] or 0),
                "late_arrival_rate": float(row["late_arrival_rate"] or 0),
                "average_working_hours": float(row["average_working_hours"] or 0),
                "total_overtime_hours": float(row["total_overtime_hours"] or 0),
                "risk_level": risk,
                "risk_score": risk_score,
            })

        # Month-over-month trend, as required by the SRS AI prompt strategy.
        trend_rows = connection.execute(
            text(f"""
                SELECT
                    DATE_FORMAT(a.attendance_date, '%Y-%m') AS month,
                    COUNT(*) AS total_records,
                    ROUND(COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN a.status IN ('Present', 'Absent', 'Half Day', 'Late') THEN 1 ELSE 0 END), 0) * 100, 0), 2) AS attendance_rate,
                    ROUND(COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN a.status IN ('Present', 'Absent', 'Half Day', 'Late') THEN 1 ELSE 0 END), 0) * 100, 0), 2) AS absenteeism_rate,
                    ROUND(COALESCE(SUM(CASE WHEN COALESCE(a.late_minutes, 0) > 0 THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN a.status IN ('Present', 'Absent', 'Half Day', 'Late') THEN 1 ELSE 0 END), 0) * 100, 0), 2) AS late_arrival_rate
                FROM attendance_logs a
                JOIN employees e ON a.employee_id = e.employee_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE 1=1 {date_filter}
                GROUP BY DATE_FORMAT(a.attendance_date, '%Y-%m')
                ORDER BY month
            """),
            params,
        ).mappings().all()

        trends = [dict(row) for row in trend_rows]

        overtime_rows = connection.execute(
            text(f"""
                SELECT
                    d.department_name AS department,
                    ROUND(COALESCE(SUM(a.overtime_hours), 0), 2) AS total_overtime_hours,
                    ROUND(COALESCE(AVG(a.overtime_hours), 0), 2) AS average_overtime_hours
                FROM attendance_logs a
                JOIN employees e ON a.employee_id = e.employee_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE 1=1 {date_filter}
                GROUP BY d.department_id, d.department_name
                ORDER BY total_overtime_hours DESC
            """),
            params,
        ).mappings().all()

        leave_date_filter = ""
        leave_params = {}
        if start_date:
            leave_date_filter += " AND l.leave_date >= :start_date"
            leave_params["start_date"] = start_date
        if end_date:
            leave_date_filter += " AND l.leave_date <= :end_date"
            leave_params["end_date"] = end_date
        if department:
            leave_date_filter += " AND d.department_name = :department"
            leave_params["department"] = department
        if allowed_department_ids:
            leave_date_filter += " AND e.department_id IN (SELECT department_id FROM department_manager_departments WHERE user_id = :manager_user_id)"
            leave_params["manager_user_id"] = manager_user_id

        leave_rows = connection.execute(
            text(f"""
                SELECT
                    l.leave_type,
                    COUNT(*) AS total_leaves,
                    SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) AS pending_leaves,
                    SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS approved_leaves,
                    SUM(CASE WHEN l.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_leaves
                FROM leaves l
                JOIN employees e ON l.employee_id = e.employee_id
                JOIN departments d ON e.department_id = d.department_id
                WHERE 1=1 {leave_date_filter}
                GROUP BY l.leave_type
                ORDER BY total_leaves DESC
            """),
            leave_params,
        ).mappings().all()

    return {
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "department": department,
        },
        "overall": {
            "total_attendance_records": total_records,
            "attendance_rate": attendance_rate,
            "absenteeism_rate": absenteeism_rate,
            "late_arrival_rate": late_arrival_rate,
            "average_working_hours": round(float(summary_row["average_working_hours"] or 0), 2),
            "total_overtime_hours": round(float(summary_row["total_overtime_hours"] or 0), 2),
        },
        "departments": departments,
        "risk_departments": [d for d in departments if d["risk_level"] != "Low Risk"],
        "trends": trends,
        "overtime": [dict(row) for row in overtime_rows],
        "leave_patterns": [dict(row) for row in leave_rows],
    }


def _generate_gemini_insights(metrics):
    """Generate structured HR attendance insights using Gemini."""

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    print("========== GEMINI DEBUG ==========")
    print("API KEY FOUND:", bool(api_key))
    print("MODEL:", AI_MODEL)
    print("===================================")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the backend."
        )

    try:
        from google import genai
        from google.genai import types

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Gemini SDK is not installed. Run: pip install -U google-genai"
        )

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
You are an HR attendance analytics assistant.

Analyze ONLY the following attendance data.

Do not invent employees, departments, percentages, causes,
or facts that are not present in the data.

DATA:
{json.dumps(metrics, default=str)}

Return a JSON object with exactly these fields:

executive_summary:
A short 1-2 sentence summary.

attendance_health:
An object containing:
- status: one of Healthy, Needs Attention, At Risk, Critical
- explanation: short explanation

risk_departments:
A maximum of 3 departments with attendance risks.
Each item must contain:
- department
- risk_level
- reason

recommendations:
Maximum 4 practical HR recommendations.

trend_analysis:
A short analysis of the attendance trend.

actionable_insights:
Maximum 4 actionable insights.
"""

        response_schema = {
            "type": "OBJECT",
            "properties": {
                "executive_summary": {
                    "type": "STRING"
                },
                "attendance_health": {
                    "type": "OBJECT",
                    "properties": {
                        "status": {
                            "type": "STRING",
                            "enum": [
                                "Healthy",
                                "Needs Attention",
                                "At Risk",
                                "Critical"
                            ]
                        },
                        "explanation": {
                            "type": "STRING"
                        }
                    },
                    "required": [
                        "status",
                        "explanation"
                    ]
                },
                "risk_departments": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "department": {
                                "type": "STRING"
                            },
                            "risk_level": {
                                "type": "STRING"
                            },
                            "reason": {
                                "type": "STRING"
                            }
                        },
                        "required": [
                            "department",
                            "risk_level",
                            "reason"
                        ]
                    }
                },
                "recommendations": {
                    "type": "ARRAY",
                    "items": {
                        "type": "STRING"
                    }
                },
                "trend_analysis": {
                    "type": "STRING"
                },
                "actionable_insights": {
                    "type": "ARRAY",
                    "items": {
                        "type": "STRING"
                    }
                }
            },
            "required": [
                "executive_summary",
                "attendance_health",
                "risk_departments",
                "recommendations",
                "trend_analysis",
                "actionable_insights"
            ]
        }

        response = client.models.generate_content(
            model=AI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                thinking_config=types.ThinkingConfig(
                    thinking_level="low"
                ),
                max_output_tokens=2000,
            ),
        )

        print("========== GEMINI RESPONSE ==========")
        print(response.text)
        print("======================================")

        if not response.text:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty response."
            )

        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned invalid JSON."
            )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        print("========== GEMINI ERROR ==========")
        print(repr(exc))
        print("==================================")

        raise HTTPException(
            status_code=502,
            detail=f"Gemini insight generation failed: {str(exc)}"
        )   
def _generate_and_store_ai_insights(
    start_date=None,
    end_date=None,
    department=None,
    current_user=None
):
    global _latest_ai_insights

    allowed_department_ids = None

    if current_user:
        role = current_user.get("role")
        employee_id = current_user.get("employee_id")

        if role == "DEPARTMENT_MANAGER":

            if employee_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Manager account is not linked to an employee record"
                )

            with engine.connect() as connection:
                allowed_department_ids = get_manager_department_ids(
                    connection, current_user
                )

            if not allowed_department_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No departments are assigned to this department manager"
                )

            if department:
                with engine.connect() as connection:
                    requested_department_id = connection.execute(
                        text("""
                            SELECT department_id
                            FROM departments
                            WHERE department_name = :department
                        """),
                        {
                            "department": department
                        }
                    ).scalar()

                if requested_department_id not in allowed_department_ids:
                    raise HTTPException(
                        status_code=403,
                        detail="You can only access AI insights for your own department"
                    )

    metrics = _collect_ai_metrics(
        start_date,
        end_date,
        department,
        allowed_department_ids,
        current_user.get("user_id") if current_user else None
    )

    insights = _generate_gemini_insights(metrics)

    _latest_ai_insights = {
        "success": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": AI_MODEL,
        "filters": metrics["filters"],
        "metrics": metrics,
        "insights": insights,
    }

    return _latest_ai_insights

@app.get(
    "/api/ai/insights",
    dependencies=[Depends(require_role(*AI_ROLES))]
)
def get_ai_insights(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user),
):
    """Return the latest generated AI insights."""
    if _latest_ai_insights is None:
        raise HTTPException(
            status_code=404,
            detail="No AI insights have been generated yet. Use POST /api/ai/generate."
        )

    # A filtered request is generated on demand so the department/date filter
    # actually changes the analysis instead of returning unrelated cached data.
    requested_filters = {
        "start_date": start_date,
        "end_date": end_date,
        "department": department,
    }
    if requested_filters != _latest_ai_insights.get("filters"):
        return _generate_and_store_ai_insights(
    start_date,
    end_date,
    department,
    current_user
)

    return _latest_ai_insights


@app.post(
    "/api/ai/generate",
    dependencies=[Depends(require_role(*AI_ROLES))]
)
def generate_ai_insights(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user),
):
    return _generate_and_store_ai_insights(
    start_date=start_date,
    end_date=end_date,
    department=department,
    current_user=current_user,
)



@app.get(
    "/api/ai/export/pdf",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "EXECUTIVE"
    ))]
)
def export_ai_insights_pdf(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user),
):
    """Export the current AI attendance insights as a PDF."""
    insights = get_ai_insights(
        start_date=start_date,
        end_date=end_date,
        department=department,
        current_user=current_user,
    )

    ai = insights.get("insights", {})
    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    pdf_styles = getSampleStyleSheet()
    story = [
        Paragraph("AI Attendance Insights", pdf_styles["Title"]),
        Spacer(1, 10),
        Paragraph(
            f"Generated: {insights.get('generated_at', '-')}",
            pdf_styles["Normal"],
        ),
    ]

    filters = insights.get("filters", {})
    story.extend([
        Spacer(1, 6),
        Paragraph(
            "Filters: "
            f"Start={filters.get('start_date') or 'All'}, "
            f"End={filters.get('end_date') or 'All'}, "
            f"Department={filters.get('department') or 'All'}",
            pdf_styles["Normal"],
        ),
        Spacer(1, 14),
    ])

    def add_section(title, body):
        story.append(Paragraph(title, pdf_styles["Heading2"]))
        if isinstance(body, list):
            if body:
                for item in body:
                    story.append(
                        Paragraph(
                            f"• {str(item)}",
                            pdf_styles["BodyText"],
                        )
                    )
                    story.append(Spacer(1, 4))
            else:
                story.append(
                    Paragraph("None identified.", pdf_styles["BodyText"])
                )
        else:
            story.append(
                Paragraph(
                    str(body or "Not available."),
                    pdf_styles["BodyText"],
                )
            )
        story.append(Spacer(1, 10))

    add_section("Executive Summary", ai.get("executive_summary"))

    health = ai.get("attendance_health") or {}
    add_section(
        "Attendance Health",
        f"Status: {health.get('status', 'Unavailable')} — "
        f"{health.get('explanation', '')}",
    )

    risks = ai.get("risk_departments") or []
    risk_lines = [
        f"{item.get('department', '-')}: "
        f"{item.get('risk_level', '-')}; "
        f"{item.get('reason', '-')}"
        for item in risks
        if isinstance(item, dict)
    ]
    add_section("Risk Departments", risk_lines)
    add_section("Trend Analysis", ai.get("trend_analysis"))
    add_section("Recommendations", ai.get("recommendations") or [])
    add_section("Actionable Insights", ai.get("actionable_insights") or [])

    document.build(story)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                "attachment; filename=ai_attendance_insights.pdf"
        },
    )

@app.get(
    "/api/ai/recommendations",
    dependencies=[Depends(require_role(*AI_ROLES))]
)
def get_ai_recommendations(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    department: str | None = Query(None),
    current_user=Depends(get_current_user),
):
    """Return only the recommendation portion of the latest AI analysis."""
    insights = get_ai_insights(
    start_date,
    end_date,
    department,
    current_user,
)
    return {
        "success": True,
        "generated_at": insights["generated_at"],
        "filters": insights["filters"],
        "recommendations": insights["insights"].get("recommendations", []),
    }
# =========================
# AUDIT LOGS
# =========================

@app.get(
    "/api/audit-logs",
    dependencies=[Depends(require_role(
        "SUPER_ADMIN",
        "HR_MANAGER"
    ))]
)
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500)
):
    with SessionLocal() as db:
        logs = (
            db.query(AuditLog)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "module": log.module,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "status": log.status,
                "error_message": log.error_message,
                "timestamp": log.timestamp,
            }
            for log in logs
        ]
    
