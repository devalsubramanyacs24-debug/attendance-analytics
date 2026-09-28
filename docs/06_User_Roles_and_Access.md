# Attendance Analytics – User Roles and Access Control

## 1. Overview

Attendance Analytics uses role-based access control (RBAC) to provide different levels of functionality and information to users based on their assigned organizational role.

The system supports six primary roles:

1. SUPERADMIN
2. HR_MANAGER
3. DATA_ANALYST
4. Department Manager
5. Executive
6. Employee

Each role is intended to access the features and information relevant to its responsibilities.

---

## 2. Role-Based Access Control

The general access flow is:

```text
User
  ↓
Login
  ↓
Authentication
  ↓
Role Identification
  ↓
Authorization
  ↓
Role-Specific Access
  ↓
Dashboard / Functionality