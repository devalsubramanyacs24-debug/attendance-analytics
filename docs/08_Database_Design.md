# Attendance Analytics – Database Design

## 1. Overview

Attendance Analytics uses MySQL as the primary relational database for persistent application data.

The database provides centralized storage for information required by authentication, employee management, attendance processing, dashboards, and analytics.

SQLAlchemy is used by the backend application to interact with the database.

---

## 2. Database Technology

| Component | Technology |
|-----------|------------|
| Database Management System | MySQL |
| Database Interaction | SQLAlchemy |
| Backend | FastAPI |
| Data Processing | Python |
| Frontend | React |

---

## 3. Purpose of the Database

The database is responsible for providing persistent and centralized storage for application information.

The database supports:

- User information
- Employee information
- Attendance information
- Attendance-related processed values
- Organizational information
- Information required by dashboards
- Data used for analytics

Centralized database storage allows different application components to work with a consistent source of information.

---

## 4. Major Data Entities

The system works with several major categories of information.

### 4.1 Users

The user-related data supports application authentication and role-based access.

Typical information associated with users includes:

- User identity
- Authentication information
- Assigned role
- Account status

The exact fields are defined by the implemented database schema.

---

### 4.2 Employees

Employee information is used to identify employees and associate attendance records with the correct employee.

Employee-related information may include:

- Employee identifier
- Employee name
- Department
- Designation
- Employee status
- Other organizational information

The exact fields are defined by the implemented schema.

---

### 4.3 Attendance Records

Attendance records contain employee attendance information used by the ETL pipeline and dashboards.

Attendance-related information may include:

- Employee identifier
- Attendance date
- Check-in information
- Check-out information
- Working hours
- Overtime
- Attendance status
- Late minutes

The exact fields are defined by the implemented schema.

---

### 4.4 Department / Organizational Information

Organizational information is used to associate employees with their relevant departments and support department-level analytics.

This information is used by features such as:

- Department-based dashboards
- Workforce analytics
- Employee information
- Department Manager access

---

### 4.5 Leave and Holiday Information

Leave and holiday information is considered during attendance processing.

Approved leave and applicable holidays can affect the resulting attendance status and related calculations.

---

## 5. Entity Relationships

The major conceptual relationships can be represented as:

```text
                    ┌───────────────┐
                    │     Users     │
                    └───────┬───────┘
                            │
                            │ Role
                            │
                            ▼
                    ┌───────────────┐
                    │     Roles     │
                    └───────────────┘


                    ┌───────────────┐
                    │   Employee    │
                    └───────┬───────┘
                            │
                 Employee ID│
                            │
                            ▼
                    ┌───────────────┐
                    │  Attendance   │
                    │    Records    │
                    └───────────────┘
                            │
                            │ Attendance Data
                            ▼
                    ┌───────────────┐
                    │    Analytics  │
                    │   / Dashboards│
                    └───────────────┘


                    ┌───────────────┐
                    │   Department  │
                    └───────┬───────┘
                            │
                            │ Department
                            ▼
                    ┌───────────────┐
                    │   Employee    │
                    └───────────────┘