# Attendance Analytics – System Architecture

## 1. Architecture Overview

Attendance Analytics follows a layered application architecture consisting of a frontend, backend API, data-processing layer, database, authentication and authorization components, and analytics/visualization components.

The major components of the system are:

- React frontend
- FastAPI backend
- Authentication and authorization
- Attendance ETL and processing layer
- MySQL database
- Role-specific dashboards
- Power BI integration

The architecture separates user interaction, business logic, data processing, and data storage to improve maintainability and extensibility.

---

## 2. High-Level Architecture

The overall architecture can be represented as:

```text
                    ┌──────────────────────┐
                    │      End Users       │
                    │                      │
                    │ SUPERADMIN           │
                    │ HR_MANAGER           │
                    │ DATA_ANALYST          │
                    │ Department Manager    │
                    │ Executive             │
                    │ Employee             │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │                      │
                    │ Login                │
                    │ Dashboards            │
                    │ Employee Management   │
                    │ Attendance Views      │
                    └──────────┬───────────┘
                               │
                         HTTP / API
                               │
                               ▼
                    ┌──────────────────────┐
                    │   FastAPI Backend    │
                    │                      │
                    │ Authentication       │
                    │ Authorization        │
                    │ REST APIs             │
                    │ Business Logic        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
     ┌──────────────────────┐      ┌──────────────────────┐
     │ Attendance ETL       │      │ SQLAlchemy / DB      │
     │ & Processing         │      │ Layer                │
     │                      │      │                      │
     │ File Validation      │      │ Database Operations  │
     │ Employee Validation  │      │ Queries              │
     │ Time Parsing         │      │ Persistence           │
     │ Working Hours        │      └──────────┬───────────┘
     │ Overtime             │                 │
     │ Status               │                 ▼
     │ Late Minutes         │      ┌──────────────────────┐
     └──────────┬───────────┘      │     MySQL Database   │
                │                  │                      │
                └─────────────────►│ Employee Data        │
                                   │ Attendance Data       │
                                   │ User Data             │
                                   │ Related Information   │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │   Analytics Layer    │
                                   │                      │
                                   │ Web Dashboards       │
                                   │ Power BI              │
                                   └──────────────────────┘