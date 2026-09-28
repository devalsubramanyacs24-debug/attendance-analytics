# API Documentation

## 1. Overview

The Attendance Analytics system uses a RESTful API architecture to allow the React frontend to communicate with the FastAPI backend.

The API acts as the communication layer between the frontend application, backend business logic, authentication system, ETL processing, and database.

```text
React Frontend
      |
      | HTTP Requests
      v
FastAPI REST API
      |
      +---- Authentication
      |
      +---- Business Logic
      |
      +---- ETL Processing
      |
      +---- Database Operations
      |
      v
MySQL Database