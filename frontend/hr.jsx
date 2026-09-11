import React, { useEffect, useState } from "react";
import axios from "axios";
import Reports from "./reports";
const API_URL = "http://127.0.0.1:8000";

export default function HRDashboard({ user, token, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [risks, setRisks] = useState([]);
  const [trends, setTrends] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [overtime, setOvertime] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [employeeMessage, setEmployeeMessage] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [departmentList, setDepartmentList] = useState([]);

const [employeeForm, setEmployeeForm] = useState({
  employee_code: "",
  employee_name: "",
  email: "",
  department_id: "",
  designation: "",
  joining_date: "",
  status: "Active",
});
  

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const headers = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const getParams = () => {
  const params = {};

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  if (department) {
    params.department = department;
  }

  return params;
};
const loadAIInsights = async () => {
  if (!token) return;

  try {
    setAiLoading(true);
    setAiError("");

    const response = await axios.get(
      `${API_URL}/api/ai/insights`,
      {
        ...headers,
        params: getParams(),
      }
    );

    setAiInsights(response.data || null);
  } catch (err) {
    setAiInsights(null);

    if (err.response?.status !== 404) {
      setAiError(
        err.response?.data?.detail ||
          "Unable to load AI insights."
      );
    }
  } finally {
    setAiLoading(false);
  }
};

const generateAIInsights = async () => {
  if (!token) return;

  try {
    setAiLoading(true);
    setAiError("");

    const response = await axios.post(
      `${API_URL}/api/ai/generate`,
      {},
      {
        ...headers,
        params: getParams(),
      }
    );

    setAiInsights(response.data || null);
  } catch (err) {
    setAiError(
      err.response?.data?.detail ||
        err.message ||
        "Unable to generate AI insights."
    );
  } finally {
    setAiLoading(false);
  }
};

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  setUploading(true);
  setUploadMessage("");
  setUploadError("");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_URL}/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const data = response.data;

    setUploadMessage(
      `Upload successful. ${data.records_inserted} new record(s) inserted and ${data.duplicates_skipped} duplicate(s) skipped.`
    );

    // Refresh dashboard analytics
    await loadDashboard();

  } catch (err) {
    console.error(
      "Attendance upload error:",
      err
    );

    setUploadError(
      err.response?.data?.detail ||
        "Attendance file upload failed."
    );

  } finally {
    setUploading(false);

    // Allow the same file to be selected again
    event.target.value = "";
  }
};

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const params = getParams();

      const results = await Promise.allSettled([
        axios.get(`${API_URL}/employees`, {
  ...headers,
}),
        axios.get(`${API_URL}/analytics/summary`, {
          ...headers,
          params,
        }),

        axios.get(`${API_URL}/analytics/departments`, {
          ...headers,
          params,
        }),

        axios.get(`${API_URL}/analytics/employee-risk`, {
  ...headers,
  params,
}),

        axios.get(`${API_URL}/analytics/trends`, {
          ...headers,
          params,
        }),

        axios.get(`${API_URL}/attendance`, {
          ...headers,
          params,
        }),

        axios.get(`${API_URL}/analytics/leave`, {
          ...headers,
          params,
        }),
        axios.get(`${API_URL}/leaves`, {
  ...headers,
}),

        axios.get(`${API_URL}/analytics/overtime`, {
          ...headers,
          params,
        }),

        axios.get(`${API_URL}/analytics/anomalies`, {
          ...headers,
          params,
        }),
        axios.get(`${API_URL}/departments`, {
  ...headers,
}),
      ]);

      const [
  employeeResult,
  summaryResult,
  departmentResult,
  riskResult,
  trendsResult,
  attendanceResult,
  leaveResult,
  leaveRequestsResult,
  overtimeResult,
  anomalyResult,
  departmentListResult,
] = results;

      if (employeeResult.status === "fulfilled") {
  setEmployees(employeeResult.value.data || []);
}

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
      }

      if (departmentResult.status === "fulfilled") {
        setDepartments(departmentResult.value.data || []);
      }

      if (riskResult.status === "fulfilled") {
        setRisks(riskResult.value.data || []);
      }

      if (trendsResult.status === "fulfilled") {
        setTrends(trendsResult.value.data || []);
      }

      if (attendanceResult.status === "fulfilled") {
        setAttendance(attendanceResult.value.data || []);
      }

      if (leaveResult.status === "fulfilled") {
        setLeaves(leaveResult.value.data || []);
      }
      if (leaveRequestsResult.status === "fulfilled") {
  setLeaveRequests(
    leaveRequestsResult.value.data || []
  );
}

      if (overtimeResult.status === "fulfilled") {
        setOvertime(overtimeResult.value.data || []);
      }

      if (departmentListResult.status === "fulfilled") {
  setDepartmentList(
    departmentListResult.value.data || []
  );
}

      if (anomalyResult.status === "fulfilled") {
        const data = anomalyResult.value.data;

        setAnomalies(
          Array.isArray(data)
            ? data
            : data?.anomalies || []
        );
      }

      const failed = results.filter(
        (result) => result.status === "rejected"
      );

      if (failed.length === results.length) {
        throw new Error(
          "Unable to load HR dashboard data."
        );
      }

      loadAIInsights();
    } catch (err) {
      console.error("HR dashboard error:", err);

      if (err.response?.status === 401) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setError(
          "You do not have permission to access the HR dashboard."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Unable to load HR dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  };
  const resetEmployeeForm = () => {
  setEmployeeForm({
    employee_code: "",
    employee_name: "",
    email: "",
    department_id: "",
    designation: "",
    joining_date: "",
    status: "Active",
  });

  setEditingEmployee(null);
  setEmployeeError("");
  setEmployeeMessage("");
};

const handleEmployeeInput = (event) => {
  const { name, value } = event.target;

  setEmployeeForm((previous) => ({
    ...previous,
    [name]: value,
  }));
};

const openAddEmployee = () => {
  resetEmployeeForm();
  setShowEmployeeForm(true);
};

const openEditEmployee = (employee) => {
  setEditingEmployee(employee);

  setEmployeeForm({
    employee_code: employee.employee_code || "",
    employee_name: employee.employee_name || "",
    email: employee.email || "",
    department_id: employee.department_id || "",
    designation: employee.designation || "",
    joining_date: employee.joining_date
      ? String(employee.joining_date).slice(0, 10)
      : "",
    status: employee.status || "Active",
  });

  setEmployeeMessage("");
  setEmployeeError("");
  setShowEmployeeForm(true);
};

const handleEmployeeSubmit = async (event) => {
  event.preventDefault();

  setEmployeeSaving(true);
  setEmployeeMessage("");
  setEmployeeError("");

  try {
    const payload = {
      employee_code: employeeForm.employee_code.trim(),
      employee_name: employeeForm.employee_name.trim(),
      email: employeeForm.email.trim() || null,
      department_id: Number(employeeForm.department_id),
      designation: employeeForm.designation.trim() || null,
      joining_date: employeeForm.joining_date || null,
      status: employeeForm.status,
    };

    if (!payload.employee_code || !payload.employee_name) {
      throw new Error(
        "Employee code and employee name are required."
      );
    }

    if (!payload.department_id) {
      throw new Error(
        "Please select a department."
      );
    }

    if (editingEmployee) {
      await axios.put(
        `${API_URL}/employees/${editingEmployee.employee_id}`,
        payload,
        headers
      );

      setEmployeeMessage(
        "Employee updated successfully."
      );
    } else {
      await axios.post(
        `${API_URL}/employees`,
        payload,
        headers
      );

      setEmployeeMessage(
        "Employee created successfully."
      );
    }

    setShowEmployeeForm(false);
    resetEmployeeForm();

    await loadDashboard();

  } catch (err) {
    console.error(
      "Employee save error:",
      err
    );

    setEmployeeError(
      err.response?.data?.detail ||
        err.message ||
        "Unable to save employee."
    );

  } finally {
    setEmployeeSaving(false);
  }
};

const handleDeactivateEmployee = async (employee) => {
  const confirmed = window.confirm(
    `Are you sure you want to deactivate ${employee.employee_name}?`
  );

  if (!confirmed) return;

  setEmployeeMessage("");
  setEmployeeError("");

  try {
    await axios.delete(
      `${API_URL}/employees/${employee.employee_id}`,
      headers
    );

    setEmployeeMessage(
      `${employee.employee_name} has been deactivated.`
    );

    await loadDashboard();

  } catch (err) {
    console.error(
      "Employee deactivation error:",
      err
    );

    setEmployeeError(
      err.response?.data?.detail ||
        "Unable to deactivate employee."
    );
  }
};

const handleDeleteEmployee = async (employee) => {
  if (!window.confirm(`Permanently delete ${employee.employee_name}? This cannot be undone.`)) return;
  setEmployeeMessage("");
  setEmployeeError("");
  try {
    await axios.delete(`${API_URL}/employees/${employee.employee_id}/permanent`, headers);
    setEmployeeMessage(`${employee.employee_name} was permanently deleted.`);
    await loadDashboard();
  } catch (err) {
    setEmployeeError(err.response?.data?.detail || "Unable to permanently delete employee.");
  }
};
const handleLeaveAction = async (leaveId, status) => {
  const action = status === "Approved"
    ? "approve"
    : "reject";

  const confirmed = window.confirm(
    `Are you sure you want to ${action} this leave request?`
  );

  if (!confirmed) return;

  setLeaveActionLoading(true);
  setLeaveMessage("");
  setLeaveError("");

  try {
    await axios.put(
      `${API_URL}/leaves/${leaveId}`,
      null,
      {
        ...headers,
        params: {
          status,
        },
      }
    );

    setLeaveMessage(
      `Leave request ${status.toLowerCase()} successfully.`
    );

    await loadDashboard();

  } catch (err) {
    console.error(
      "Leave action error:",
      err
    );

    setLeaveError(
      err.response?.data?.detail ||
        `Unable to ${action} leave request.`
    );

  } finally {
    setLeaveActionLoading(false);
  }
};

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const departmentNames = [
  ...new Set(
    departmentList
      .map((item) => item.department_name)
      .filter(Boolean)
  ),
];

  const filteredDepartments = department
    ? departments.filter(
        (item) =>
          item.department_name === department
      )
    : departments;

  const filteredAttendance = department
    ? attendance.filter(
        (item) =>
          item.department_name === department
      )
    : attendance;

  const filteredRisks = department
    ? risks.filter(
        (item) =>
          item.department_name === department
      )
    : risks;

  const presentCount = filteredAttendance.filter(
    (item) => item.status === "Present"
  ).length;

  const absentCount = filteredAttendance.filter(
    (item) => item.status === "Absent"
  ).length;

  const lateCount = filteredAttendance.filter(
    (item) => Number(item.late_minutes || 0) > 0
  ).length;

  const formatNumber = (value) =>
    Number(value || 0).toFixed(2);

  const formatDate = (value) => {
  if (!value) return "-";

  const text = String(value);

  // Prevent timezone shifting for YYYY-MM-DD values
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const datePart = text.slice(0, 10);
    const [year, month, day] = datePart.split("-");

    return `${day}/${month}/${year}`;
  }

  try {
    return new Date(value).toLocaleDateString("en-IN");
  } catch {
    return text;
  }
};

  const clearFilters = async () => {
  setStartDate("");
  setEndDate("");
  setDepartment("");

  try {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      axios.get(`${API_URL}/employees`, {
        ...headers,
      }),

      axios.get(`${API_URL}/analytics/summary`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/analytics/departments`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/analytics/employee-risk`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/analytics/trends`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/attendance`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/analytics/leave`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/leaves`, {
        ...headers,
      }),

      axios.get(`${API_URL}/analytics/overtime`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/analytics/anomalies`, {
        ...headers,
        params: {},
      }),

      axios.get(`${API_URL}/departments`, {
        ...headers,
      }),
    ]);

    const [
      employeeResult,
      summaryResult,
      departmentResult,
      riskResult,
      trendsResult,
      attendanceResult,
      leaveResult,
      leaveRequestsResult,
      overtimeResult,
      anomalyResult,
      departmentListResult,
    ] = results;

    if (employeeResult.status === "fulfilled") {
      setEmployees(employeeResult.value.data || []);
    }

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value.data);
    }

    if (departmentResult.status === "fulfilled") {
      setDepartments(departmentResult.value.data || []);
    }

    if (riskResult.status === "fulfilled") {
      setRisks(riskResult.value.data || []);
    }

    if (trendsResult.status === "fulfilled") {
      setTrends(trendsResult.value.data || []);
    }

    if (attendanceResult.status === "fulfilled") {
      setAttendance(attendanceResult.value.data || []);
    }

    if (leaveResult.status === "fulfilled") {
      setLeaves(leaveResult.value.data || []);
    }

    if (leaveRequestsResult.status === "fulfilled") {
      setLeaveRequests(
        leaveRequestsResult.value.data || []
      );
    }

    if (overtimeResult.status === "fulfilled") {
      setOvertime(overtimeResult.value.data || []);
    }

    if (anomalyResult.status === "fulfilled") {
      const data = anomalyResult.value.data;

      setAnomalies(
        Array.isArray(data)
          ? data
          : data?.anomalies || []
      );
    }

    if (departmentListResult.status === "fulfilled") {
      setDepartmentList(
        departmentListResult.value.data || []
      );
    }

  } catch (err) {
    console.error(
      "Clear filters error:",
      err
    );

    setError(
      err.response?.data?.detail ||
        "Unable to reset dashboard filters."
    );
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>

          <h2>Loading HR Dashboard</h2>

          <p>
            Fetching attendance and workforce analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <h2>Dashboard Unavailable</h2>

          <p>{error}</p>

          <button
            style={styles.primaryButton}
            onClick={loadDashboard}
          >
            Retry
          </button>

          <button
            style={styles.secondaryButton}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            HR Manager Dashboard
          </h1>

          <p style={styles.subtitle}>
            Workforce attendance, leave and performance analytics
          </p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <strong>
              {user?.name || "HR Manager"}
            </strong>

            <span>
              {user?.email || ""}
            </span>

            <span style={styles.roleBadge}>
              HR MANAGER
            </span>
          </div>

          <button
            style={styles.logoutButton}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={styles.container}>

        {/* FILTERS */}

        <section style={styles.filterCard}>

          <div>
            <label style={styles.label}>
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(e) =>
                setEndDate(e.target.value)
              }
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>
              Department
            </label>

            <select
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
              style={styles.input}
            >
              <option value="">
                All Departments
              </option>

              {departmentNames.map((name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            style={styles.primaryButton}
            onClick={loadDashboard}
          >
            Apply Filters
          </button>

          <button
            style={styles.secondaryButton}
            onClick={clearFilters}
          >
            Clear
          </button>

        </section>
        <section style={styles.uploadCard}>

  <div>
    <h2 style={styles.uploadTitle}>
      Upload Attendance Data
    </h2>

    <p style={styles.uploadSubtitle}>
      Upload a CSV file to validate, process,
      and add attendance records.
    </p>
  </div>

  <label style={styles.uploadButton}>
    {uploading
      ? "Uploading..."
      : "Choose CSV File"}

    <input
      type="file"
      accept=".csv,text/csv"
      onChange={handleFileUpload}
      disabled={uploading}
      style={{
        display: "none",
      }}
    />
  </label>

  {uploadMessage && (
    <div style={styles.uploadSuccess}>
      {uploadMessage}
    </div>
  )}

  {uploadError && (
    <div style={styles.uploadError}>
      {uploadError}
    </div>
  )}

</section>

        {/* REPORTS */}

<Reports token={token} />

{/* EMPLOYEE MANAGEMENT */}

<section style={styles.card}>

  <div style={styles.employeeHeader}>

    <div>
      <h2 style={styles.sectionTitle}>
        Employee Management
      </h2>

      <p style={styles.sectionSubtitle}>
        Add, edit and manage organization employees
      </p>
    </div>

    <button
      style={styles.primaryButton}
      onClick={openAddEmployee}
    >
      + Add Employee
    </button>

  </div>

  {employeeMessage && (
    <div style={styles.employeeSuccess}>
      {employeeMessage}
    </div>
  )}

  {employeeError && (
    <div style={styles.employeeError}>
      {employeeError}
    </div>
  )}

  {employees.length === 0 ? (

    <EmptyState text="No employees found." />

  ) : (

    <Table>

      <thead>
        <tr>

          <th style={styles.th}>
            Employee Code
          </th>

          <th style={styles.th}>
            Employee Name
          </th>

          <th style={styles.th}>
            Email
          </th>

          <th style={styles.th}>
            Department
          </th>

          <th style={styles.th}>
            Designation
          </th>

          <th style={styles.th}>
            Joining Date
          </th>

          <th style={styles.th}>
            Status
          </th>

          <th style={styles.th}>
            Actions
          </th>

        </tr>
      </thead>

      <tbody>

        {employees.map((employee) => (

          <tr key={employee.employee_id}>

            <td style={styles.td}>
              {employee.employee_code}
            </td>

            <td style={styles.td}>
              <strong>
                {employee.employee_name}
              </strong>
            </td>

            <td style={styles.td}>
              {employee.email || "-"}
            </td>

            <td style={styles.td}>
              {employee.department_name ||
                employee.department_id ||
                "-"}
            </td>

            <td style={styles.td}>
              {employee.designation || "-"}
            </td>

            <td style={styles.td}>
              {formatDate(employee.joining_date)}
            </td>

            <td style={styles.td}>
              <StatusBadge
                status={employee.status}
              />
            </td>

            <td style={styles.td}>

              <button
                style={styles.editButton}
                onClick={() =>
                  openEditEmployee(employee)
                }
              >
                Edit
              </button>

              {employee.status !== "Inactive" && (
                <button
                  style={styles.deactivateButton}
                  onClick={() =>
                    handleDeactivateEmployee(employee)
                  }
                >
                  Deactivate
                </button>
              )}

            

              <button
                style={styles.deleteButton}
                onClick={() => handleDeleteEmployee(employee)}
              >
                Delete
              </button>
</td>

          </tr>

        ))}

      </tbody>

    </Table>

  )}

</section>

{/* EMPLOYEE FORM */}

{showEmployeeForm && (
  <section style={styles.formCard}>

    <div style={styles.employeeHeader}>

      <div>
        <h2 style={styles.sectionTitle}>
          {editingEmployee
            ? "Edit Employee"
            : "Add New Employee"}
        </h2>

        <p style={styles.sectionSubtitle}>
          {editingEmployee
            ? "Update employee information"
            : "Create a new employee record"}
        </p>
      </div>

      <button
        style={styles.secondaryButton}
        onClick={() => {
          setShowEmployeeForm(false);
          resetEmployeeForm();
        }}
      >
        Cancel
      </button>

    </div>

    <form
      onSubmit={handleEmployeeSubmit}
      style={styles.employeeForm}
    >

      <div>
        <label style={styles.label}>
          Employee Code *
        </label>

        <input
          name="employee_code"
          value={employeeForm.employee_code}
          onChange={handleEmployeeInput}
          style={styles.input}
          required
        />
      </div>

      <div>
        <label style={styles.label}>
          Employee Name *
        </label>

        <input
          name="employee_name"
          value={employeeForm.employee_name}
          onChange={handleEmployeeInput}
          style={styles.input}
          required
        />
      </div>

      <div>
        <label style={styles.label}>
          Email
        </label>

        <input
          type="email"
          name="email"
          value={employeeForm.email}
          onChange={handleEmployeeInput}
          style={styles.input}
        />
      </div>

      <div>
        <label style={styles.label}>
          Department *
        </label>

        <select
          name="department_id"
          value={employeeForm.department_id}
          onChange={handleEmployeeInput}
          style={styles.input}
          required
        >

          <option value="">
            Select Department
          </option>

          {departmentList.map((item) => (
            <option
              key={item.department_id}
              value={item.department_id}
            >
              {item.department_name}
            </option>
          ))}

        </select>
      </div>

      <div>
        <label style={styles.label}>
          Designation
        </label>

        <input
          name="designation"
          value={employeeForm.designation}
          onChange={handleEmployeeInput}
          style={styles.input}
        />
      </div>

      <div>
        <label style={styles.label}>
          Joining Date
        </label>

        <input
          type="date"
          name="joining_date"
          value={employeeForm.joining_date}
          onChange={handleEmployeeInput}
          style={styles.input}
        />
      </div>

      <div>
        <label style={styles.label}>
          Status
        </label>

        <select
          name="status"
          value={employeeForm.status}
          onChange={handleEmployeeInput}
          style={styles.input}
        >
          <option value="Active">
            Active
          </option>

          <option value="Inactive">
            Inactive
          </option>
        </select>
      </div>

      <div style={styles.formActions}>

        <button
          type="submit"
          style={styles.primaryButton}
          disabled={employeeSaving}
        >
          {employeeSaving
            ? "Saving..."
            : editingEmployee
              ? "Update Employee"
              : "Create Employee"}
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => {
            setShowEmployeeForm(false);
            resetEmployeeForm();
          }}
        >
          Cancel
        </button>

      </div>

    </form>

  </section>
)}
{/* LEAVE MANAGEMENT */}

<section style={styles.card}>

  <SectionHeader
    title="Leave Management"
    subtitle="Review and manage employee leave requests"
  />

  {leaveMessage && (
    <div style={styles.employeeSuccess}>
      {leaveMessage}
    </div>
  )}

  {leaveError && (
    <div style={styles.employeeError}>
      {leaveError}
    </div>
  )}

  {leaveRequests.length === 0 ? (

    <EmptyState text="No leave requests found." />

  ) : (

    <Table>

      <thead>
        <tr>

          <th style={styles.th}>
            Employee
          </th>

          <th style={styles.th}>
            Code
          </th>

          <th style={styles.th}>
            Leave Date
          </th>

          <th style={styles.th}>
            Type
          </th>

          <th style={styles.th}>
            Reason
          </th>

          <th style={styles.th}>
            Status
          </th>

          <th style={styles.th}>
            Actions
          </th>

        </tr>
      </thead>

      <tbody>

        {leaveRequests.map((leave) => (

          <tr key={leave.leave_id}>

            <td style={styles.td}>
              <strong>
                {leave.employee_name || "-"}
              </strong>
            </td>

            <td style={styles.td}>
              {leave.employee_code || "-"}
            </td>

            <td style={styles.td}>
              {formatDate(leave.leave_date)}
            </td>

            <td style={styles.td}>
              {leave.leave_type || "-"}
            </td>

            <td style={styles.td}>
              {leave.reason || "-"}
            </td>

            <td style={styles.td}>
              <StatusBadge
                status={leave.status}
              />
            </td>

            <td style={styles.td}>

              {leave.status === "Pending" ? (

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >

                  <button
                    style={styles.approveButton}
                    disabled={leaveActionLoading}
                    onClick={() =>
                      handleLeaveAction(
                        leave.leave_id,
                        "Approved"
                      )
                    }
                  >
                    Approve
                  </button>

                  <button
                    style={styles.rejectButton}
                    disabled={leaveActionLoading}
                    onClick={() =>
                      handleLeaveAction(
                        leave.leave_id,
                        "Rejected"
                      )
                    }
                  >
                    Reject
                  </button>

                </div>

              ) : (

                <span style={{ color: "#64748b" }}>
                  No action
                </span>

              )}

            </td>

          </tr>

        ))}

      </tbody>

    </Table>

  )}

</section>

{/* AI INSIGHTS */}

        <section style={styles.card}>

          <div style={styles.aiHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                AI Insights
              </h2>
              <p style={styles.sectionSubtitle}>
                AI-powered attendance health, department risks,
                trends, recommendations and actionable insights
              </p>
            </div>

            <div style={styles.aiActions}>
              <button
                style={styles.primaryButton}
                onClick={generateAIInsights}
                disabled={aiLoading}
              >
                {aiLoading ? "Generating..." : "Generate AI Insights"}
              </button>

              <button
                style={styles.secondaryButton}
                onClick={loadAIInsights}
                disabled={aiLoading}
              >
                Refresh AI
              </button>
            </div>
          </div>

          {aiError && (
            <div style={styles.aiError}>{aiError}</div>
          )}

          {aiLoading && !aiInsights ? (
            <EmptyState text="Generating AI insights..." />
          ) : !aiInsights?.insights ? (
            <EmptyState text="No AI insights available yet. Generate insights to analyze the current HR attendance data." />
          ) : (
            <div style={styles.aiGrid}>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>Executive Summary</h3>
                <p style={styles.aiText}>
                  {aiInsights.insights.executive_summary ||
                    "No summary available."}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>Attendance Health</h3>
                <strong>
                  {aiInsights.insights.attendance_health?.status ||
                    "Unavailable"}
                </strong>
                <p style={styles.aiText}>
                  {aiInsights.insights.attendance_health?.explanation || ""}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>Risk Departments</h3>
                {(aiInsights.insights.risk_departments || []).length === 0 ? (
                  <p style={styles.aiText}>No department risks identified.</p>
                ) : (
                  <ul style={styles.aiList}>
                    {aiInsights.insights.risk_departments.map((item, index) => (
                      <li key={index}>
                        <strong>{item.department}</strong>{" "}
                        — {item.risk_level}: {item.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>Trend Analysis</h3>
                <p style={styles.aiText}>
                  {aiInsights.insights.trend_analysis ||
                    "No trend analysis available."}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>Recommendations</h3>
                {(aiInsights.insights.recommendations || []).length === 0 ? (
                  <p style={styles.aiText}>No recommendations available.</p>
                ) : (
                  <ul style={styles.aiList}>
                    {aiInsights.insights.recommendations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>Actionable Insights</h3>
                {(aiInsights.insights.actionable_insights || []).length === 0 ? (
                  <p style={styles.aiText}>
                    No actionable insights available.
                  </p>
                ) : (
                  <ul style={styles.aiList}>
                    {aiInsights.insights.actionable_insights.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          )}

        </section>

        {/* KPI CARDS */}
        <section style={styles.kpiGrid}>

          <MetricCard
            title="Total Employees"
            value={
              summary?.total_employees ?? 0
            }
          />

          <MetricCard
            title="Attendance Rate"
            value={`${formatNumber(
              summary?.attendance_rate
            )}%`}
          />

          <MetricCard
            title="Present"
            value={
              summary?.present ??
              presentCount
            }
          />

          <MetricCard
            title="Absent"
            value={
              summary?.absent ??
              absentCount
            }
          />

          <MetricCard
            title="Late"
            value={
              summary?.late ??
              lateCount
            }
          />

          <MetricCard
            title="Avg Working Hours"
            value={formatNumber(
              summary?.average_working_hours
            )}
          />

          <MetricCard
            title="Overtime Hours"
            value={formatNumber(
              summary?.total_overtime_hours
            )}
          />

          <MetricCard
            title="Departments"
            value={departments.length}
          />

        </section>

        {/* DEPARTMENT PERFORMANCE */}

        <section style={styles.card}>

          <SectionHeader
            title="Department Performance"
            subtitle="Compare attendance performance across departments"
          />

          {filteredDepartments.length === 0 ? (
            <EmptyState text="No department data available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Department
                  </th>

                  <th style={styles.th}>
                    Records
                  </th>

                  <th style={styles.th}>
                    Present
                  </th>

                  <th style={styles.th}>
                    Absent
                  </th>

                  <th style={styles.th}>
                    Late
                  </th>

                  <th style={styles.th}>
                    Attendance %
                  </th>

                  <th style={styles.th}>
                    Avg Hours
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDepartments.map(
                  (item, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        <strong>
                          {item.department_name}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {item.total_records ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.present_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.absent_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.late_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.attendance_rate ?? 0}%
                      </td>

                      <td style={styles.td}>
                        {item.average_working_hours ?? 0}
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </Table>
          )}

        </section>

        {/* ATTENDANCE TRENDS */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Trends"
            subtitle="Daily attendance movement"
          />

          {trends.length === 0 ? (
            <EmptyState text="No trend data available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Date
                  </th>

                  <th style={styles.th}>
                    Records
                  </th>

                  <th style={styles.th}>
                    Present
                  </th>

                  <th style={styles.th}>
                    Absent
                  </th>

                  <th style={styles.th}>
                    Late
                  </th>

                  <th style={styles.th}>
                    Attendance %
                  </th>
                </tr>
              </thead>

              <tbody>
                {trends.map(
                  (item, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        {formatDate(
                          item.attendance_date
                        )}
                      </td>

                      <td style={styles.td}>
                        {item.total_records ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.present_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.absent_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.late_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.attendance_rate ?? 0}%
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </Table>
          )}

        </section>

        {/* EMPLOYEE RISK */}

        <section style={styles.card}>

          <SectionHeader
            title="Employee Attendance Risk"
            subtitle="Employees requiring HR attention"
          />

          {filteredRisks.length === 0 ? (
            <EmptyState text="No employee risk data available." />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Employee
                  </th>

                  <th style={styles.th}>
                    Department
                  </th>

                  <th style={styles.th}>
                    Attendance %
                  </th>

                  <th style={styles.th}>
                    Absences
                  </th>

                  <th style={styles.th}>
                    Late
                  </th>

                  <th style={styles.th}>
                    Risk
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRisks.map(
                  (item, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        <strong>
                          {item.employee_name}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {item.department_name}
                      </td>

                      <td style={styles.td}>
                        {formatNumber(
                          item.attendance_rate
                        )}%
                      </td>

                      <td style={styles.td}>
                        {item.absent_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        {item.late_count ?? 0}
                      </td>

                      <td style={styles.td}>
                        <RiskBadge
                          risk={
                            item.risk_level
                          }
                        />
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </Table>
          )}

        </section>

        {/* LEAVE ANALYTICS */}

        <section style={styles.card}>

          <SectionHeader
            title="Leave Analytics"
            subtitle="Organization-wide leave information"
          />

          {leaves.length === 0 ? (
            <EmptyState text="No leave analytics available." />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Category
                  </th>

                  <th style={styles.th}>
                    Count
                  </th>

                  <th style={styles.th}>
                    Days
                  </th>
                </tr>
              </thead>

              <tbody>
                {leaves.map(
                  (item, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        {item.leave_type ??
                          item.status ??
                          item.category ??
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {item.count ??
                          item.total ??
                          0}
                      </td>

                      <td style={styles.td}>
                        {item.total_days ??
                          item.days ??
                          0}
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </Table>
          )}

        </section>

        {/* OVERTIME */}

        <section style={styles.card}>

          <SectionHeader
            title="Overtime Analytics"
            subtitle="Recorded employee overtime"
          />

          {overtime.length === 0 ? (
            <EmptyState text="No overtime data available." />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Employee
                  </th>

                  <th style={styles.th}>
                    Department
                  </th>

                  <th style={styles.th}>
                    Overtime Hours
                  </th>
                </tr>
              </thead>

              <tbody>
                {overtime.map(
                  (item, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        {item.employee_name ??
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {item.department_name ??
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {formatNumber(
                          item.overtime_hours ??
                            item.total_overtime_hours
                        )}
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </Table>
          )}

        </section>

        {/* ANOMALIES */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Anomalies"
            subtitle="Potentially unusual attendance records"
          />

          {anomalies.length === 0 ? (
            <EmptyState text="No attendance anomalies detected." />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Employee
                  </th>

                  <th style={styles.th}>
                    Department
                  </th>

                  <th style={styles.th}>
                    Date
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Reason
                  </th>
                </tr>
              </thead>

              <tbody>
                {anomalies.map(
                  (item, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        {item.employee_name ??
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {item.department_name ??
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {formatDate(
                          item.attendance_date
                        )}
                      </td>

                      <td style={styles.td}>
                        {item.status ?? "-"}
                      </td>

                      <td style={styles.td}>
                        {Array.isArray(
                          item.anomaly_reasons
                        )
                          ? item.anomaly_reasons.join(
                              ", "
                            )
                          : item.reason ?? "-"}
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </Table>
          )}

        </section>

        {/* ATTENDANCE RECORDS */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Records"
            subtitle="Detailed employee attendance"
          />

          {filteredAttendance.length === 0 ? (
            <EmptyState text="No attendance records available." />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Employee
                  </th>

                  <th style={styles.th}>
                    Code
                  </th>

                  <th style={styles.th}>
                    Department
                  </th>

                  <th style={styles.th}>
                    Date
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Hours
                  </th>

                  <th style={styles.th}>
                    Overtime
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAttendance
                  .slice(0, 100)
                  .map(
                    (item, index) => (
                      <tr key={index}>

                        <td style={styles.td}>
                          {item.employee_name ??
                            "-"}
                        </td>

                        <td style={styles.td}>
                          {item.employee_code ??
                            "-"}
                        </td>

                        <td style={styles.td}>
                          {item.department_name ??
                            "-"}
                        </td>

                        <td style={styles.td}>
                          {formatDate(
                            item.attendance_date
                          )}
                        </td>

                        <td style={styles.td}>
                          <StatusBadge
                            status={
                              item.status
                            }
                          />
                        </td>

                        <td style={styles.td}>
                          {item.working_hours ??
                            0}
                        </td>

                        <td style={styles.td}>
                          {item.overtime_hours ??
                            0}
                        </td>

                      </tr>
                    )
                  )}
              </tbody>

            </Table>
          )}

        </section>
        {/* AUDIT LOGS */}

<section style={styles.card}>

  <SectionHeader
    title="Audit Logs"
    subtitle="Security and system activity history"
  />

  <button
    onClick={async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/audit-logs`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              limit: 100,
            },
          }
        );

        setAuditLogs(response.data || []);

      } catch (error) {
  console.error(
    "Failed to load audit logs:",
    error
  );

  setEmployeeError(
    error.response?.data?.detail ||
      "Failed to load audit logs."
  );
}
    }}
    style={styles.primaryButton}
  >
    Refresh Audit Logs
  </button>

  <div
    style={{
      ...styles.tableWrapper,
      marginTop: "20px",
    }}
  >
    <table style={styles.table}>

      <thead>
        <tr>
          <th style={styles.th}>Time</th>
          <th style={styles.th}>Action</th>
          <th style={styles.th}>Module</th>
          <th style={styles.th}>Resource</th>
          <th style={styles.th}>Status</th>
        </tr>
      </thead>

      <tbody>

        {auditLogs.length === 0 ? (

          <tr>
            <td
              colSpan="5"
              style={{
                ...styles.td,
                textAlign: "center",
              }}
            >
              No audit logs loaded.
            </td>
          </tr>

        ) : (

          auditLogs.map((log, index) => (

            <tr key={index}>

              <td style={styles.td}>
                {formatDate(
                  log.timestamp
                )}
              </td>

              <td style={styles.td}>
                {log.action ?? "-"}
              </td>

              <td style={styles.td}>
                {log.module ?? "-"}
              </td>

              <td style={styles.td}>
                {log.resource ?? "-"}
              </td>

              <td style={styles.td}>
                <StatusBadge
                  status={log.status}
                />
              </td>

            </tr>

          ))

        )}

      </tbody>

    </table>
  </div>

</section>

      </main>
    </div>
  );
}


/* =========================
   REUSABLE COMPONENTS
========================= */

function MetricCard({
  title,
  value,
}) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricTitle}>
        {title}
      </p>

      <h2 style={styles.metricValue}>
        {value}
      </h2>
    </div>
  );
}


function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>
        {title}
      </h2>

      <p style={styles.sectionSubtitle}>
        {subtitle}
      </p>
    </div>
  );
}


function EmptyState({ text }) {
  return (
    <div style={styles.emptyState}>
      {text}
    </div>
  );
}


function RiskBadge({ risk }) {
  const value =
    String(risk || "Unknown");

  const lower =
    value.toLowerCase();

  let background = "#e5e7eb";
  let color = "#374151";

  if (lower === "high") {
    background = "#fee2e2";
    color = "#991b1b";
  }

  if (lower === "medium") {
    background = "#fef3c7";
    color = "#92400e";
  }

  if (lower === "low") {
    background = "#dcfce7";
    color = "#166534";
  }

  return (
    <span
      style={{
        ...styles.badge,
        background,
        color,
      }}
    >
      {value}
    </span>
  );
}


function StatusBadge({ status }) {
  const value =
    String(status || "-");

  const lower =
    value.toLowerCase();

  let background = "#e5e7eb";
  let color = "#374151";

  if (
    lower === "present" ||
    lower === "approved" ||
    lower === "active" ||
    lower === "success"
  ) {
    background = "#dcfce7";
    color = "#166534";
  }

  if (
    lower === "absent" ||
    lower === "rejected" ||
    lower === "inactive" ||
    lower === "failed"
  ) {
    background = "#fee2e2";
    color = "#991b1b";
  }

  if (
    lower === "late" ||
    lower === "pending"
  ) {
    background = "#fef3c7";
    color = "#92400e";
  }

  return (
    <span
      style={{
        ...styles.badge,
        background,
        color,
      }}
    >
      {value}
    </span>
  );
}


function Table({ children }) {
  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        {children}
      </table>
    </div>
  );
}


/* =========================
   STYLES
========================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#1f2937",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  header: {
    background: "#111827",
    color: "#fff",
    padding: "24px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
  },

  title: {
  margin: 0,
  fontSize: "28px",
  color: "#f8fafc",
},

  subtitle: {
    margin: "7px 0 0",
    color: "#cbd5e1",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "3px",
  },

  roleBadge: {
    marginTop: "3px",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#2563eb",
    fontWeight: 700,
  },

  logoutButton: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  container: {
    maxWidth: "1450px",
    margin: "0 auto",
    padding: "30px",
  },

  filterCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "end",
    flexWrap: "wrap",
    gap: "16px",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.06)",
    border: "1px solid #e5e7eb",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 600,
  },

  input: {
    minWidth: "170px",
    padding: "10px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    background: "#fff",
  },

  primaryButton: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 17px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "10px 17px",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 700,
    marginLeft: "10px",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },

  metricCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.06)",
  },

  metricTitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
  },

  metricValue: {
    margin: "10px 0 0",
    fontSize: "30px",
  },

  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.06)",
  },

  sectionHeader: {
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "800px",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
    fontSize: "13px",
    color: "#475569",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },

  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "8px",
  },

  aiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  aiActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  aiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },

  aiPanel: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "18px",
  },

  aiPanelTitle: {
    margin: "0 0 8px",
    fontSize: "16px",
  },

  aiText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },

  aiList: {
    margin: "8px 0 0",
    paddingLeft: "20px",
    color: "#475569",
    lineHeight: 1.7,
  },

  aiError: {
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "8px",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f7fb",
    padding: "20px",
  },

  loadingCard: {
    background: "#fff",
    padding: "40px",
    borderRadius: "14px",
    textAlign: "center",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.08)",
  },

  errorCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "14px",
    textAlign: "center",
    maxWidth: "500px",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.08)",
  },

  spinner: {
    width: "34px",
    height: "34px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    margin: "0 auto 20px",
  },
  uploadCard: {
  background: "#fff",
  borderRadius: "12px",
  padding: "24px",
  marginBottom: "24px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 2px 10px rgba(15,23,42,0.06)",
  display: "flex",
  alignItems: "center",
  gap: "24px",
  flexWrap: "wrap",
},

uploadTitle: {
  margin: 0,
  fontSize: "20px",
},

uploadSubtitle: {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
},

uploadButton: {
  display: "inline-block",
  padding: "11px 18px",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
},

uploadSuccess: {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "14px",
},

uploadError: {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "14px",
},
employeeHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "18px",
},

employeeForm: {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
},

formCard: {
  background: "#fff",
  borderRadius: "12px",
  padding: "24px",
  marginBottom: "24px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 2px 10px rgba(15,23,42,0.06)",
},

formActions: {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginTop: "8px",
},

editButton: {
  border: "1px solid #2563eb",
  borderRadius: "7px",
  padding: "7px 11px",
  background: "#fff",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: 700,
  marginRight: "8px",
},

deactivateButton: {
  border: "1px solid #dc2626",
  borderRadius: "7px",
  padding: "7px 11px",
  background: "#fff",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 700,
},

employeeSuccess: {
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#dcfce7",
  color: "#166534",
  marginBottom: "18px",
  fontSize: "14px",
},

employeeError: {
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#fee2e2",
  color: "#991b1b",
  marginBottom: "18px",
  fontSize: "14px",
},
approveButton: {
  border: "1px solid #16a34a",
  borderRadius: "7px",
  padding: "7px 11px",
  background: "#fff",
  color: "#16a34a",
  cursor: "pointer",
  fontWeight: 700,
},

rejectButton: {
  border: "1px solid #dc2626",
  borderRadius: "7px",
  padding: "7px 11px",
  background: "#fff",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 700,
},
};
