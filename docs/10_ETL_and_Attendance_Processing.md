# Attendance Analytics – ETL and Attendance Processing

## 1. Overview

The Attendance Analytics system uses an ETL (Extract, Transform, Load) workflow to process raw attendance data.

The ETL layer is responsible for reading attendance files, validating the input, transforming attendance information, calculating derived metrics, and preparing the processed data for use by the application.

The primary attendance-processing functionality is implemented in:

```text
backend/etl.py