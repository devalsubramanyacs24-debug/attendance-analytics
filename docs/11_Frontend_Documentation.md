# Frontend Documentation

## 1. Overview

The Attendance Analytics frontend provides the user interface through which different users interact with the attendance management and analytics system.

The frontend is developed using **React** and provides role-based dashboards for the different users of the system.

The main responsibilities of the frontend are:

- Providing a login interface.
- Managing user navigation.
- Displaying role-specific dashboards.
- Presenting attendance and workforce information.
- Providing attendance data upload functionality where applicable.
- Displaying employee and department information.
- Presenting attendance anomalies and related information.
- Providing employee activation/deactivation controls where authorized.
- Integrating analytical visualizations, including Power BI-based analytics.
- Communicating with the backend APIs.

---

## 2. Frontend Technology

The frontend is implemented using:

- **React** – UI development and component-based architecture.
- **JavaScript/JSX** – Application logic and UI components.
- **CSS** – Styling and layout.
- **REST API integration** – Communication with the FastAPI backend.
- **Power BI** – Analytical visualization and reporting.

The frontend follows a component-based approach so that different parts of the application can be developed and maintained independently.

---

## 3. Frontend Architecture

The frontend can be viewed as three major layers:

```text
+--------------------------------------+
|           User Interface             |
|                                      |
| Login | Dashboards | Tables | Charts |
+------------------+-------------------+
                   |
                   v
+--------------------------------------+
|        Frontend Application Logic    |
|                                      |
| Routing | Role Handling | UI State   |
| API Calls | Data Processing          |
+------------------+-------------------+
                   |
                   v
+--------------------------------------+
|          Backend REST APIs           |
|                                      |
| FastAPI | Authentication | Database  |
+--------------------------------------+