# Deployment and Environment Setup

## 1. Overview

The Attendance Analytics system is a full-stack application consisting of:

- React frontend
- FastAPI backend
- MySQL database
- Attendance ETL and processing
- Analytics and reporting
- AI-powered insights
- Power BI integration
- Scheduled background jobs

This document describes the local development environment, environment configuration, database setup, application startup, testing, and deployment-related considerations.

---

## 2. System Architecture

```text
                    +----------------------+
                    |    React Frontend    |
                    |       Vite           |
                    +----------+-----------+
                               |
                               | REST API
                               v
                    +----------------------+
                    |    FastAPI Backend   |
                    |----------------------|
                    | Authentication / RBAC|
                    | ETL / Analytics      |
                    | Reports / AI Insights|
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    MySQL Database    |
                    +----------+-----------+
                               |
                +--------------+--------------+
                |                             |
                v                             v
       +----------------+            +----------------+
       | Analytics &    |            |    Power BI    |
       | Reporting      |            |   Dashboards   |
       +----------------+            +----------------+

              Scheduled background jobs
              run through the backend
                  scheduler

3. Prerequisites

The following software is required for local development:

Python
Node.js
npm
MySQL
Git

The backend uses FastAPI, SQLAlchemy and Uvicorn.

The frontend uses React and Vite.

4. Repository Setup

Clone the repository:

git clone https://github.com/devalsubramanyacs24-debug/attendance-analytics.git

Navigate into the project:

cd attendance-analytics

. Backend Environment Setup

Create a Python virtual environment from the project root:

python -m venv venv

Activate the virtual environment:

.\venv\Scripts\Activate.ps1

Install the backend dependencies:

pip install -r backend\requirements.txt
6. Environment Variables

The backend provides an environment template:

backend/.env.example

The template contains the following variables:

DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_NAME=attendance_analytics
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET_KEY=your_jwt_secret_key

Create the local environment file:

Copy-Item backend\.env.example backend\.env

Then replace the placeholder values with the actual local configuration.

Environment Variable Description
Variable	Purpose
DB_USER	MySQL database username
DB_PASSWORD	MySQL database password
DB_HOST	MySQL database host
DB_NAME	Attendance Analytics database name
GEMINI_API_KEY	API key used for AI-related functionality
JWT_SECRET_KEY	Secret key used for JWT authentication
Security

The backend/.env file contains sensitive configuration and must not be committed to GitHub.

Use backend/.env.example as the safe configuration template.

7. MySQL Database Setup

Make sure the MySQL server is running.

Create the application database:

CREATE DATABASE attendance_analytics;

Configure the database connection in backend/.env:

DB_USER=<your_database_username>
DB_PASSWORD=<your_database_password>
DB_HOST=localhost
DB_NAME=attendance_analytics

The backend uses SQLAlchemy for database access.

8. Start the Backend

From the project root, with the Python virtual environment activated:

uvicorn backend.main:app --reload

The --reload option enables automatic reloading during development.

9. Frontend Setup

Open a second terminal.

Navigate to the frontend directory:

cd frontend

Install frontend dependencies:

npm install

Start the Vite development server:

npm run dev

The terminal will display the local frontend URL.

10. Frontend Build and Linting

Create a production frontend build:

npm run build

Preview the generated build:

npm run preview

Run the frontend linter:

npm run lint
11. Application Workflow

The main attendance processing workflow is:

Attendance CSV
      |
      v
File Upload
      |
      v
Column & Data Validation
      |
      v
Employee Validation
      |
      v
ETL Processing
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
      +---- Leave / Holiday Checks
      |
      v
MySQL Database
      |
      v
Role-Based Dashboards
      |
      +---- Super Admin
      +---- HR Manager
      +---- Data Analyst
      +---- Department Manager
      +---- Executive
      +---- Employee
      |
      v
Analytics / Reports / AI Insights
      |
      v
Power BI
12. Attendance Upload

The system provides attendance upload functionality with validation and ETL processing.

The SRS-compatible attendance upload API endpoints are:

POST   /api/upload/attendance
GET    /api/upload/history
GET    /api/upload/{id}/status
DELETE /api/upload/{id}

The SRS-compatible attendance upload endpoint reuses the existing attendance upload implementation.

Upload-related operations are protected using role-based authorization.

13. Authentication and Role-Based Access

The application provides role-based access for the following users:

SUPER_ADMIN
HR_MANAGER
DATA_ANALYST
Department Manager
Executive
Employee

Authentication and authorization are handled by the FastAPI backend.

Role-based access controls restrict access to protected functionality and administrative operations.

14. Administrative Configuration

The backend provides Super Admin configuration endpoints for:

GET /api/admin/settings
PUT /api/admin/settings

PUT /api/admin/kpis

PUT /api/admin/business-rules

These configuration areas support:

System settings
KPI configuration
Business-rule configuration

Administrative configuration changes are also recorded through audit actions.

15. Scheduled Background Jobs

The backend includes an APScheduler-based background job system.

Implemented scheduled operations include:

Daily ETL processing
Weekly rollups
Dashboard metrics updates
Daily reports
Monthly reports
Database backups
Data archival
Data cleanup
AI insights generation

The AI insights job is configured to run daily at:

04:00

The scheduler is initialized as part of the backend application.

16. Testing

The project contains automated tests covering major application functionality.

Test areas include:

Authentication
API functionality
ETL processing
Attendance upload
Employee endpoints
Analytics
KPI calculations
AI metrics
Forecasting
Overtime consistency
Scheduler functionality
WebSocket functionality
Administrative security

Run the backend test suite from the project root:

pytest
17. Power BI Integration

Power BI is used as part of the project's analytics and reporting layer.

The Power BI integration supports analysis and visualization of attendance-related information, including:

Attendance metrics
Workforce metrics
Department-level analysis
KPI reporting
Trends and analytical insights

Detailed Power BI documentation is available at:

docs/15_Power_BI_and_Analytics.md
18. Local Generated Data

The project may generate local files during development and application execution.

Important local directories include:

data/uploads/
data/backups/
data/reports/

These directories contain local or generated data and are excluded from Git tracking where appropriate.

Generated files and database backups should not be committed to the public repository.

19. Project Structure
attendance-analytics/
│
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── etl.py
│   ├── main.py
│   ├── scheduler.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── package.json
│   ├── src/
│   └── ...
│
├── data/
│   ├── uploads/
│   ├── backups/
│   └── reports/
│
├── docs/
├── tests/
├── README.md
└── .gitignore
20. Local Development Checklist

Before running the application locally, verify:

 Python is installed
 Node.js and npm are installed
 MySQL is installed and running
 Repository has been cloned
 Python virtual environment has been created
 Backend dependencies have been installed
 backend/.env has been created
 Database credentials are configured
 attendance_analytics database exists
 Backend starts successfully
 Frontend dependencies have been installed
 Frontend starts successfully
21. Security Considerations

The following information must remain private:

Database passwords
JWT secret keys
Gemini API keys
Other authentication credentials
Local environment configuration

Never commit real secrets or credentials to the repository.

The repository uses .env.example to document the required environment variables without exposing their real values.

22. Development Commands Summary
Backend

Create virtual environment:

python -m venv venv

Activate environment:

.\venv\Scripts\Activate.ps1

Install dependencies:

pip install -r backend\requirements.txt

Start backend:

uvicorn backend.main:app --reload

Run tests:

pytest
Frontend

Navigate to frontend:

cd frontend

Install dependencies:

npm install

Start development server:

npm run dev

Build frontend:

npm run build

Run linting:

npm run lint

Preview production build:

npm run preview
23. Production Deployment Considerations

The commands in this document are primarily intended for local development and project demonstration.

A production deployment should additionally consider:

Production database configuration
Secure secret management
HTTPS
Production frontend hosting
Backend process management
Database backup and recovery
Monitoring and logging
Access control
Infrastructure configuration
Environment-specific configuration

Production configuration should be adapted to the selected hosting environment.

24. Related Documentation

Additional project documentation is available in the docs/ directory.

Important documents include:

Project Overview
Problem Statement
Objectives
System Requirements
System Architecture
User Roles and Access
System Workflow
Database Design
Backend Documentation
ETL and Attendance Processing
Frontend Documentation
API Documentation
Authentication and Security
Testing and Quality Assurance
Power BI and Analytics
Deployment and Environment Setup
Limitations and Future Enhancements
Results and Conclusion
25. Summary

The local Attendance Analytics environment consists of:

React + Vite
      |
      v
FastAPI + Python
      |
      v
SQLAlchemy
      |
      v
MySQL
      |
      +---- Analytics
      +---- Reports
      +---- AI Insights
      +---- Power BI

The backend and frontend run as separate development processes while MySQL provides the application database.

The project also includes role-based access control, attendance ETL, analytics, reporting, scheduled background jobs, AI insights, and Power BI integration.


### After pasting

Press:

**Ctrl + S**

Then run:

```powershell
(Get-Content .\docs\16_Deployment_and_Environment_Setup.md).Count