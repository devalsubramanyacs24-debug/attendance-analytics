Attendance Analytics

A full-stack attendance management and analytics system designed to process attendance data, provide role-based dashboards, and support workforce analytics through an integrated web application and Power BI.

Overview

Attendance Analytics is a role-based attendance analytics platform that combines data processing, backend APIs, a React frontend, database management, and business intelligence.

The system is designed to transform attendance data into useful operational insights for different organizational roles.

The project includes:

Role-based dashboards

Attendance data upload and processing

Attendance validation and ETL processing

Employee and department-level information

Attendance analytics

Backend REST APIs

Authentication and authorization

MySQL database integration

Power BI analytics integration

Testing and quality assurance documentation

Project Objectives

The main objectives of the project are to:

Centralize attendance data processing

Validate and transform attendance records

Provide role-specific access to attendance information

Present attendance information through dashboards

Support workforce and attendance analysis

Integrate processed data with Power BI

Provide a structured and maintainable full-stack application

User Roles

The system supports six organizational roles:

Role

Purpose

SUPERADMIN

System-level administration

HR_MANAGER

Employee and attendance management

DATA_ANALYST

Attendance analytics and reporting

Department Manager

Department-level monitoring

Executive

Executive-level attendance insights

Employee

Individual attendance information

Access to functionality is controlled according to the user's role.

Core Features

Attendance Processing

Attendance file upload

Required-column validation

Employee ID validation

Time parsing

Attendance value validation

Working-hours calculation

Overtime calculation

Attendance status calculation

Late-minute calculation

Holiday and approved-leave handling

Role-Based Dashboards

The application provides dashboards designed around the requirements of different organizational roles.

Each role receives access to the information and functionality relevant to that role.

Analytics

The system provides attendance-related analytics that can be consumed through the application and Power BI integration.

Backend

The backend provides:

REST APIs

Authentication

Authorization

Database connectivity

Attendance processing

Employee and department operations

Analytics-related endpoints

Frontend

The frontend provides:

Role-based dashboard interfaces

Attendance information

Data visualization

User interaction with backend APIs

Dashboard-specific functionality

Technology Stack

Layer

Technology

Frontend

React

Backend

Python / FastAPI

ORM / Database Layer

SQLAlchemy

Database

MySQL

Data Processing

Python

Analytics / BI

Power BI

API Communication

REST APIs

High-Level Architecture

                    +----------------------+
                    |        Users         |
                    |   Different Roles    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    React Frontend    |
                    |    Role Dashboards   |
                    +----------+-----------+
                               |
                            REST API
                               |
                               v
                    +----------------------+
                    |   FastAPI Backend    |
                    | Authentication       |
                    | Authorization        |
                    | Business Logic       |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    Attendance ETL     |
                    | Validation            |
                    | Transformation        |
                    | Calculations          |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |        MySQL          |
                    |    Application Data   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |      Power BI         |
                    |  Analytics & Reports  |
                    +----------------------+

Attendance Data Workflow

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
      +---- Overtime
      +---- Late Minutes
      +---- Attendance Status
      |
      v
Database
      |
      +-------------------+-------------------+
      |                                       |
      v                                       v
Web Dashboards                           Power BI

Project Structure

attendance-analytics/
|
+-- backend/
|   +-- auth.py
|   +-- database.py
|   +-- etl.py
|   +-- main.py
|   +-- requirements.txt
|   +-- scheduler.py
|   +-- .env.example
|
+-- frontend/
|   +-- src/
|   |   +-- assets/
|   |   +-- App.css
|   |   +-- App.jsx
|   |   +-- index.css
|   |   +-- main.jsx
|   |
|   +-- public/
|   +-- dataanalyst.jsx
|   +-- departmentmanager.jsx
|   +-- employee.jsx
|   +-- executive.jsx
|   +-- hr.jsx
|   +-- reports.jsx
|   +-- superadmin.jsx
|   +-- package.json
|   +-- package-lock.json
|   +-- vite.config.js
|
+-- data/
|   +-- backups/
|   +-- uploads/
|
+-- docs/
|   +-- 01_Project_Overview.md
|   +-- 02_Problem_Statement.md
|   +-- 03_Objectives.md
|   +-- 04_System_Requirements.md
|   +-- 05_System_Architecture.md
|   +-- 06_User_Roles_and_Access.md
|   +-- 07_System_Workflow.md
|   +-- 08_Database_Design.md
|   +-- 09_Backend_Documentation.md
|   +-- 10_ETL_and_Attendance_Processing.md
|   +-- 11_Frontend_Documentation.md
|   +-- 12_API_Documentation.md
|   +-- 13_Authentication_and_Security.md
|   +-- 14_Testing_and_Quality_Assurance.md
|   +-- 15_PowerBI_and_Analytics.md
|   +-- 16_Deployment_and_Environment_Setup.md
|   +-- 17_Limitations_and_Future_Enhancements.md
|   +-- 18_Results_and_Conclusion.md
|   +-- README.md
|
+-- tests/
|   +-- test_admin_security.py
|   +-- test_ai_metrics.py
|   +-- test_analytics.py
|   +-- test_api.py
|   +-- test_auth.py
|   +-- test_employee_endpoints.py
|   +-- test_etl.py
|   +-- test_forecast.py
|   +-- test_kpi.py
|   +-- test_overtime_consistency.py
|   +-- test_scheduler.py
|   +-- test_upload.py
|   +-- test_websocket.py
|
+-- .gitignore
+-- package.json
+-- package-lock.json
+-- README.md

Local virtual environments, environment files, frontend build output, uploaded data, and other local/generated files are excluded from version control through .gitignore.

Documentation

Detailed technical documentation is available in the docs directory.

Documentation Sections

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

Setup

1. Clone the Repository

git clone <repository-url>
cd attendance-analytics

2. Backend Setup

Create and activate a Python virtual environment:

python -m venv venv

On Windows:

venv\Scripts\activate

Navigate to the backend directory:

cd backend

Install the backend dependencies:

pip install -r requirements.txt

3. Environment Configuration

Configure the required environment variables for the backend and database connection.

Use the provided .env.example as a reference for the required configuration.

For detailed instructions, refer to:

Deployment and Environment Setup

4. Start the Backend

Use the backend startup instructions documented in the deployment documentation:

Deployment and Environment Setup

5. Start the Frontend

From the project root, navigate to the frontend directory:

cd frontend

Install frontend dependencies:

npm install

Start the development server:

npm run dev

Testing

The project includes a dedicated test suite covering multiple areas of the application, including:

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

Detailed testing information is available in:

Testing and Quality Assurance

Power BI Integration

Power BI is integrated into the project for analytics and business-intelligence reporting.

The integration and analytics approach are documented separately in:

Power BI and Analytics

Screenshots

Screenshots of the implemented dashboards and application workflow can be added here.

Recommended sections:

Login

Superadmin Dashboard

HR Manager Dashboard

Data Analyst Dashboard

Department Manager Dashboard

Executive Dashboard

Employee Dashboard

Attendance Upload

Attendance Analytics

Power BI Dashboard

Future Enhancements

Potential future improvements are documented in:

Limitations and Future Enhancements

Future development should build on the existing implementation without removing currently supported functionality.

Project Documentation

For a complete technical explanation of the project, start with:

Documentation Index

The documentation covers the project progressively from its problem statement and objectives through architecture, implementation, testing, analytics, deployment, limitations, and conclusion.

Project

Attendance Analytics

A full-stack attendance processing and analytics project combining web application development, data processing, database management, and business intelligence.