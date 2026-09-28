# Deployment and Environment Setup

## 1. Overview

The Attendance Analytics project consists of multiple application components that must work together:

- React frontend
- FastAPI backend
- MySQL database
- ETL and attendance processing
- Power BI analytics

The development environment allows these components to be run and tested together.

This document describes the general environment setup, configuration, startup process, and deployment considerations for the project.

---

## 2. System Architecture

The application can be represented as:

```text
                    User
                     |
                     v
              React Frontend
                     |
                     | HTTP / API
                     v
              FastAPI Backend
                     |
             +-------+-------+
             |               |
             v               v
          ETL Logic       SQLAlchemy
                             |
                             v
                         MySQL DB
                             |
                             v
                     Processed Data
                             |
                             v
                          Power BI