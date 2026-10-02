# Attendance Analytics

A full-stack attendance management and analytics system that processes attendance data, provides role-based dashboards, performs workforce analytics, and integrates with Power BI for business intelligence reporting.

## Overview

Attendance Analytics is a role-based workforce attendance platform built with a React frontend, FastAPI backend, MySQL database, attendance ETL processing, analytics, reporting, AI-powered insights, and scheduled background jobs.

The system transforms raw attendance records into structured information that can be consumed by different organizational roles through dedicated dashboards and APIs.

## Key Features

### Attendance Processing

- Attendance file upload
- Required-column validation
- Employee ID validation
- Attendance value validation
- Time parsing
- Working-hours calculation
- Overtime calculation
- Late-minute calculation
- Attendance status calculation
- Holiday handling
- Approved-leave handling
- Attendance data persistence

### Role-Based Dashboards

The system supports six organizational roles:

| Role | Primary Responsibility |
|---|---|
| `SUPERADMIN` | System administration and configuration |
| `HR_MANAGER` | Employee and attendance management |
| `DATA_ANALYST` | Attendance analytics and reporting |
| `Department Manager` | Department-level monitoring |
| `Executive` | Executive-level attendance insights |
| `Employee` | Individual attendance information |

Access to application functionality is controlled through authentication and role-based authorization.

### Analytics and Reporting

The application provides functionality for:

- Attendance KPIs
- Workforce analytics
- Department-level analytics
- Attendance trends
- Overtime analysis
- Late attendance analysis
- Attendance anomaly analysis
- Forecast-related analytics
- Reports and exports
- Excel/PDF reporting functionality

### AI-Powered Insights

The project includes AI-related analytics and insight generation functionality.

AI insights can be generated and stored through the backend's scheduled processing system.

### Scheduled Background Jobs

The backend includes scheduled jobs using APScheduler.

The scheduler supports automated processing such as:

- AI insight generation
- Scheduled reporting
- Background analytics-related processing

The AI insights job is configured to run at **04:00**.

### Administration

Super Admin functionality includes configurable:

- System settings
- KPI configuration
- Business rules
- Administrative controls

Administrative configuration changes are handled through protected backend APIs and audit-related actions.

### Attendance Upload Management

The backend provides APIs for managing uploaded attendance files, including:

- Upload attendance files
- View upload history
- Check upload processing status
- Delete uploaded records

### Real-Time Communication

The project includes WebSocket functionality for supported application communication and corresponding automated tests.

### Power BI Integration

Processed attendance and analytics data can be used with Power BI for business-intelligence reporting and visualization.

Detailed Power BI documentation is available in the project documentation.

---

## Project Objectives

The main objectives are to:

- Centralize attendance data processing
- Validate and transform attendance records
- Provide role-specific access to attendance information
- Automate attendance calculations
- Provide workforce and attendance analytics
- Support reporting and data exports
- Integrate processed data with Power BI
- Provide AI-assisted insights
- Maintain secure role-based access
- Provide a structured and maintainable full-stack application

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend Build Tool | Vite |
| Backend | Python / FastAPI |
| ORM / Database Layer | SQLAlchemy |
| Database | MySQL |
| Data Processing | Python |
| Authentication | JWT-based authentication |
| Analytics / BI | Power BI |
| API Communication | REST APIs |
| Background Jobs | APScheduler |
| Real-Time Communication | WebSocket |
| Testing | Pytest |

---

## System Architecture

```text
                         +----------------------+
                         |        Users         |
                         |   Six User Roles     |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |    React Frontend    |
                         |   Role Dashboards    |
                         +----------+-----------+
                                    |
                               REST / WebSocket
                                    |
                                    v
                         +----------------------+
                         |   FastAPI Backend    |
                         |----------------------|
                         | Authentication / RBAC|
                         | Business Logic       |
                         | ETL / Analytics      |
                         | Reports              |
                         | AI Insights           |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |    MySQL Database    |
                         +----------+-----------+
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  v                                   v
        +----------------------+           +----------------------+
        | Analytics / Reports  |           |      Power BI        |
        +----------------------+           | Analytics & Reports  |
                                           +----------------------+

Attendance File
      |
      v
File Upload
      |
      v
Column Validation
      |
      v
Employee Validation
      |
      v
Attendance Value Validation
      |
      v
Time Parsing
      |
      v
Attendance Calculations
      |
      +---- Working Hours
      |
      +---- Overtime
      |
      +---- Late Minutes
      |
      +---- Attendance Status
      |
      v
Database
      |
      +----------------------+----------------------+
      |                                             |
      v                                             v
Application Dashboards                         Analytics
                                                    |
                                                    v
                                                 Power BI

Backend

The FastAPI backend provides:

REST APIs
Authentication
Role-based authorization
Attendance upload processing
Attendance ETL
Employee operations
Department operations
Attendance analytics
KPI functionality
Forecast-related functionality
AI-related metrics and insights
Report generation
Administrative configuration
Upload history and status management
Scheduled background jobs
WebSocket functionality

Important backend modules include:

backend/
├── auth.py
├── database.py
├── etl.py
├── main.py
├── requirements.txt
└── scheduler.py
Frontend

The React frontend provides role-specific dashboards and application interfaces for:

Super Admin
HR Manager
Data Analyst
Department Manager
Executive
Employee

The frontend also supports:

Attendance information
Data visualization
Analytics views
Reports
Backend API communication
Role-specific functionality
Application navigation
API

The backend exposes REST APIs for authentication, attendance processing, analytics, employee management, administration, reports, and other application functionality.

Attendance upload management includes:

POST   /api/upload/attendance
GET    /api/upload/history
GET    /api/upload/{id}/status
DELETE /api/upload/{id}

The complete API reference is available in:

API Documentation

Project Structure
attendance-analytics/
│
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── etl.py
│   ├── main.py
│   ├── requirements.txt
│   ├── scheduler.py
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── dataanalyst.jsx
│   ├── departmentmanager.jsx
│   ├── employee.jsx
│   ├── executive.jsx
│   ├── hr.jsx
│   ├── reports.jsx
│   ├── superadmin.jsx
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── data/
│   ├── backups/
│   └── uploads/
│
├── docs/
│   ├── 01_Project_Overview.md
│   ├── 02_Problem_Statement.md
│   ├── 03_Objectives.md
│   ├── 04_System_Requirements.md
│   ├── 05_System_Architecture.md
│   ├── 06_User_Roles_and_Access.md
│   ├── 07_System_Workflow.md
│   ├── 08_Database_Design.md
│   ├── 09_Backend_Documentation.md
│   ├── 10_ETL_and_Attendance_Processing.md
│   ├── 11_Frontend_Documentation.md
│   ├── 12_API_Documentation.md
│   ├── 13_Authentication_and_Security.md
│   ├── 14_Testing_and_Quality_Assurance.md
│   ├── 15_PowerBI_and_Analytics.md
│   ├── 16_Deployment_and_Environment_Setup.md
│   ├── 17_Limitations_and_Future_Enhancements.md
│   ├── 18_Results_and_Conclusion.md
│   └── README.md
│
├── tests/
│   ├── test_admin_security.py
│   ├── test_ai_metrics.py
│   ├── test_analytics.py
│   ├── test_api.py
│   ├── test_auth.py
│   ├── test_employee_endpoints.py
│   ├── test_etl.py
│   ├── test_forecast.py
│   ├── test_kpi.py
│   ├── test_overtime_consistency.py
│   ├── test_scheduler.py
│   ├── test_upload.py
│   └── test_websocket.py
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

Local virtual environments, environment files, frontend build output, uploaded data, database backups, and other generated/local files are excluded from version control through .gitignore.

Documentation

Detailed technical documentation is available in the docs directory.

Documentation Index
Document	Description
01 — Project Overview	Project background and overview
02 — Problem Statement	Problem being addressed
03 — Objectives	Project objectives
04 — System Requirements	Functional and non-functional requirements
05 — System Architecture	Application architecture
06 — User Roles and Access	Roles and permissions
07 — System Workflow	Application and data workflow
08 — Database Design	Database structure
09 — Backend Documentation	Backend implementation
10 — ETL and Attendance Processing	Attendance ETL pipeline
11 — Frontend Documentation	Frontend implementation
12 — API Documentation	REST API reference
13 — Authentication and Security	Authentication and security
14 — Testing and Quality Assurance	Testing strategy and results
15 — Power BI and Analytics	Power BI integration and analytics
16 — Deployment and Environment Setup	Environment and deployment guide
17 — Limitations and Future Enhancements	Limitations and future work
18 — Results and Conclusion	Results and conclusion
Setup
1. Clone the Repository
git clone https://github.com/devalsubramanyacs24-debug/attendance-analytics.git
cd attendance-analytics
2. Backend Setup

Create a Python virtual environment from the project root:

python -m venv venv

Activate it on Windows PowerShell:

.\venv\Scripts\Activate.ps1

Activate it on Windows Command Prompt:

venv\Scripts\activate

Install backend dependencies:

pip install -r backend/requirements.txt
3. Environment Configuration

Use the provided environment template:

backend/.env.example

Configure the required database and application settings.

The environment configuration includes values such as:

DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_NAME=attendance_analytics
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET_KEY=your_jwt_secret_key

Do not commit real credentials or API keys to the repository.

For complete environment and database setup instructions, see:

Deployment and Environment Setup

4. Start the Backend

From the project root, with the virtual environment activated:

uvicorn backend.main:app --reload

The backend can then be accessed through the configured local server.

5. Start the Frontend

Open a second terminal and navigate to the frontend:

cd frontend

Install frontend dependencies:

npm install

Start the Vite development server:

npm run dev
Testing

The project includes a dedicated Pytest test suite covering:

Authentication
API functionality
Administrative security
Employee endpoints
ETL processing
Analytics
KPI functionality
Forecasting
Overtime consistency
File upload
Scheduler functionality
WebSocket functionality
AI-related metrics

Run the test suite from the project root:

pytest

Detailed testing information is available in:

Testing and Quality Assurance

Frontend Development Commands

From the frontend directory:

npm run dev

Create a production build:

npm run build

Run frontend linting:

npm run lint

Preview the production build:

npm run preview
Power BI Integration

Power BI is integrated into the project for business-intelligence reporting and analytics.

The project separates application-level dashboards from Power BI-based analytics and reporting.

Detailed information is available in:

Power BI and Analytics

Scheduled Processing

The backend includes APScheduler-based background processing.

The scheduler supports automated backend tasks including AI insight generation and scheduled reporting.

The AI insights job is configured to execute at:

04:00

Additional implementation details are documented in:

Deployment and Environment Setup

Screenshots

Screenshots can be added here to demonstrate the implemented application.

Recommended screenshots:

Login
Super Admin Dashboard
HR Manager Dashboard
Data Analyst Dashboard
Department Manager Dashboard
Executive Dashboard
Employee Dashboard
Attendance Upload
Attendance Analytics
Reports
Power BI Dashboard

Screenshots are intentionally not included until final project screenshots are selected from the implemented application.

Security and Configuration

The project includes:

Authentication
Role-based authorization
Protected application functionality
Administrative access controls
Environment-based configuration
JWT secret configuration
Database credential configuration
Exclusion of secrets and generated files through .gitignore

Security documentation:

Authentication and Security

Future Enhancements

Potential future improvements are documented in:

Limitations and Future Enhancements

Future development should build on the existing implementation without removing currently supported functionality.

Project Documentation

For a complete technical explanation, start with:

Project Overview

The documentation progresses from the project problem and objectives through:

Requirements
    ↓
Architecture
    ↓
Database Design
    ↓
Backend
    ↓
ETL Processing
    ↓
Frontend
    ↓
APIs
    ↓
Authentication & Security
    ↓
Testing
    ↓
Power BI & Analytics
    ↓
Deployment
    ↓
Results & Conclusion
Project

Attendance Analytics

A full-stack attendance processing and analytics system combining:

Web application development
Role-based access control
Attendance ETL
Database management
Workforce analytics
Reporting
AI-powered insights
Scheduled background processing
Real-time communication
Power BI business intelligence
