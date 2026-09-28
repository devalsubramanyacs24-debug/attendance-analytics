# Attendance Analytics

## 1. Project Overview

Attendance Analytics is a role-based attendance management and analytics system designed to collect, process, monitor, and analyze employee attendance data.

The system provides different dashboards and functionalities based on user roles, allowing organizations to manage employee attendance records, identify attendance patterns and anomalies, monitor workforce information, and generate meaningful insights through analytics dashboards.

The application combines a backend API, database, frontend dashboards, attendance data processing, authentication, role-based access control, and Power BI integration to provide a centralized attendance analytics platform.

## 2. Purpose

The primary purpose of Attendance Analytics is to transform raw employee attendance data into structured and actionable information.

Instead of relying only on manually maintained attendance records, the system processes attendance data and presents relevant information through role-specific dashboards.

The system is intended to help different organizational users monitor attendance, analyze workforce trends, identify attendance-related issues, and make data-driven decisions.

## 3. Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- MySQL

### Frontend
- React.js

### Data Processing
- Python
- Attendance data validation and processing
- CSV-based attendance data ingestion

### Analytics and Visualization
- Power BI
- Role-specific web dashboards

### Authentication and Security
- JWT-based authentication
- Role-based access control

## 4. User Roles

The system supports the following roles:

1. SUPERADMIN
2. HR_MANAGER
3. DATA_ANALYST
4. Department Manager
5. Executive
6. Employee

Each role is provided with access to functionality and information relevant to its responsibilities.

## 5. Major Features

- User authentication
- Role-based access control
- Employee management
- Attendance CSV upload
- Attendance data validation
- Attendance data processing
- Employee ID validation
- Working-hours calculation
- Overtime calculation
- Attendance status calculation
- Late-minute calculation
- Leave and holiday handling
- Attendance anomaly monitoring
- Role-specific dashboards
- Employee attendance information
- Workforce analytics
- Absence monitoring
- Power BI integration
- Employee activation/deactivation
- Attendance analytics and visualization

## 6. High-Level Workflow

The general workflow of the system is:

Raw Attendance Data
        ↓
CSV Upload
        ↓
Data Validation
        ↓
Attendance Processing / ETL
        ↓
Database
        ↓
Backend API
        ↓
Role-Based Access
        ↓
Role-Specific Dashboards
        ↓
Analytics and Visualization
        ↓
Power BI Integration

## 7. Project Goal

The goal of Attendance Analytics is to provide a centralized system for managing attendance information and converting raw attendance records into useful analytics for different organizational roles.