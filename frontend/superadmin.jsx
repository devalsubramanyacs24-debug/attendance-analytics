import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function SuperAdminDashboard({ user, token, onLogout }) {
    const formatNumber = (value) =>
  Number(value ?? 0).toFixed(2);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [risks, setRisks] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [leaveAnalytics, setLeaveAnalytics] = useState([]);
  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    employee_code: "",
    employee_name: "",
    email: "",
    department_id: "",
    designation: "",
    joining_date: "",
    status: "Active",
  });

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: "",
    holiday_name: "",
    description: "",
  });

  const [uploading, setUploading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);


  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      setActionError("");

      const results = await Promise.allSettled([
        axios.get(`${API_URL}/analytics/summary`, authConfig),
        axios.get(`${API_URL}/employees`, authConfig),
        axios.get(`${API_URL}/analytics/departments`, authConfig),
        axios.get(`${API_URL}/attendance`, authConfig),
        axios.get(`${API_URL}/api/audit-logs`, authConfig),
        axios.get(`${API_URL}/holidays`, authConfig),
        axios.get(`${API_URL}/departments`, authConfig),
        axios.get(`${API_URL}/analytics/overtime`, authConfig),
        axios.get(`${API_URL}/analytics/employee-risk`, authConfig),
        axios.get(`${API_URL}/analytics/anomalies`, authConfig),
        axios.get(`${API_URL}/analytics/leave`, authConfig),
      ]);

      const [
        summaryResult,
        employeeResult,
        departmentResult,
        attendanceResult,
        auditResult,
        holidayResult,
        departmentListResult,
        overtimeResult,
        riskResult,
        anomalyResult,
        leaveResult,
      ] = results;

      const rejected = results.filter((r) => r.status === "rejected");

      if (summaryResult.status === "fulfilled")
        setSummary(summaryResult.value.data);

      if (employeeResult.status === "fulfilled")
        setEmployees(employeeResult.value.data || []);

      if (departmentResult.status === "fulfilled")
        setDepartments(departmentResult.value.data || []);

      if (attendanceResult.status === "fulfilled")
        setAttendance(attendanceResult.value.data || []);

      if (auditResult.status === "fulfilled")
        setAuditLogs(auditResult.value.data || []);

      if (holidayResult.status === "fulfilled")
        setHolidays(holidayResult.value.data || []);

      if (departmentListResult.status === "fulfilled")
        setDepartmentList(departmentListResult.value.data || []);

      if (overtimeResult.status === "fulfilled")
        setOvertime(overtimeResult.value.data || []);

      if (riskResult.status === "fulfilled")
        setRisks(riskResult.value.data || []);

      if (anomalyResult.status === "fulfilled") {
        const data = anomalyResult.value.data;
        setAnomalies(data?.anomalies || []);
      }

      if (leaveResult.status === "fulfilled")
        setLeaveAnalytics(leaveResult.value.data || []);

      if (rejected.length === results.length) {
        throw new Error("Unable to load Super Admin dashboard.");
      }
    } catch (err) {
      console.error("Super Admin dashboard error:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to access the Super Admin dashboard.");
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Unable to load Super Admin dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  };
  const loadAdminSettings = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/api/admin/settings`,
      authConfig
    );

    const system = response.data?.system_settings || {};
    const kpis = response.data?.kpis || {};

    setAdminSettings({
      standard_start_time: system.standard_start_time || "09:30",
      grace_period_minutes: Number(system.grace_period_minutes ?? 15),
      standard_work_hours: Number(system.standard_work_hours ?? 8),
      overtime_threshold_hours: Number(system.overtime_threshold_hours ?? 9),
      weekly_hour_cap: Number(system.weekly_hour_cap ?? 60),
      half_day_hours: Number(system.half_day_hours ?? 4),
      timezone: system.timezone || "Asia/Kolkata",
      kpis: {
        attendance_rate: kpis.attendance_rate !== false,
        absenteeism_rate: kpis.absenteeism_rate !== false,
        late_arrival_rate: kpis.late_arrival_rate !== false,
        overtime_hours: kpis.overtime_hours !== false,
        working_days: kpis.working_days !== false,
        workforce_utilization: kpis.workforce_utilization !== false,
        average_working_hours: kpis.average_working_hours !== false,
        department_attendance: kpis.department_attendance !== false,
        attendance_trend: kpis.attendance_trend !== false,
        dropout_rate: kpis.dropout_rate !== false,
        employee_retention_score: kpis.employee_retention_score !== false,
        productivity_score: kpis.productivity_score === true,
      },
    });
  } catch (err) {
    setActionError(
      err.response?.data?.detail || "Unable to load system settings."
    );
  }
};


  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  const presentCount = attendance.filter(
    (r) => String(r.status).toLowerCase() === "present"
  ).length;

  const absentCount = attendance.filter(
    (r) => String(r.status).toLowerCase() === "absent"
  ).length;

  const lateCount = attendance.filter(
    (r) => Number(r.late_minutes || 0) > 0
  ).length;

  const activeEmployees = employees.filter(
    (e) => String(e.status).toLowerCase() === "active"
  ).length;

  const inactiveEmployees = employees.filter(
    (e) => String(e.status).toLowerCase() === "inactive"
  ).length;

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
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  };

  const editEmployee = (employee) => {
    setEditingEmployeeId(employee.employee_id);
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
    setActionError("");
    setActionMessage("");
    setShowEmployeeForm(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionMessage("");

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

      if (editingEmployeeId) {
        await axios.put(
          `${API_URL}/employees/${editingEmployeeId}`,
          payload,
          authConfig
        );
        setActionMessage("Employee updated successfully.");
      } else {
        await axios.post(`${API_URL}/employees`, payload, authConfig);
        setActionMessage("Employee created successfully.");
      }

      resetEmployeeForm();
      await loadDashboard();
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          "Unable to save employee."
      );
    }
  };

  const deactivateEmployee = async (employee) => {
    if (
      !window.confirm(
        `Deactivate ${employee.employee_name}? Historical attendance will be preserved.`
      )
    ) return;

    try {
      setActionError("");
      setActionMessage("");

      await axios.delete(
        `${API_URL}/employees/${employee.employee_id}`,
        authConfig
      );

      setActionMessage("Employee deactivated successfully.");
      await loadDashboard();
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          "Unable to deactivate employee."
      );
    }
  };
  const activateEmployee = async (employee) => {
  if (!window.confirm(`Activate ${employee.employee_name}?`)) return;

  try {
    setActionError("");
    setActionMessage("");

    await axios.put(
      `${API_URL}/employees/${employee.employee_id}`,
      { status: "Active" },
      authConfig
    );

    setActionMessage("Employee activated successfully.");
    await loadDashboard();
  } catch (err) {
    setActionError(
      err.response?.data?.detail ||
        "Unable to activate employee."
    );
  }
};

  const permanentlyDeleteEmployee = async (employee) => {
    if (!window.confirm(`Permanently delete ${employee.employee_name}? This cannot be undone.`)) return;
    try {
      setActionError("");
      setActionMessage("");
      await axios.delete(`${API_URL}/employees/${employee.employee_id}/permanent`, authConfig);
      setActionMessage("Employee permanently deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setActionError(err.response?.data?.detail || "Unable to permanently delete employee.");
    }
  };

  const resetHolidayForm = () => {
    setHolidayForm({
      holiday_date: "",
      holiday_name: "",
      description: "",
    });
    setEditingHolidayId(null);
    setShowHolidayForm(false);
  };

  const editHoliday = (holiday) => {
    setEditingHolidayId(holiday.holiday_id);
    setHolidayForm({
      holiday_date: String(holiday.holiday_date || "").slice(0, 10),
      holiday_name: holiday.holiday_name || "",
      description: holiday.description || "",
    });
    setShowHolidayForm(true);
    setActionError("");
    setActionMessage("");
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionMessage("");

    try {
      if (editingHolidayId) {
        await axios.put(
          `${API_URL}/holidays/${editingHolidayId}`,
          holidayForm,
          authConfig
        );
        setActionMessage("Holiday updated successfully.");
      } else {
        await axios.post(
          `${API_URL}/holidays`,
          holidayForm,
          authConfig
        );
        setActionMessage("Holiday created successfully.");
      }

      resetHolidayForm();
      await loadDashboard();
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          "Unable to save holiday."
      );
    }
  };

  const deleteHoliday = async (holiday) => {
    if (!window.confirm(`Delete ${holiday.holiday_name}?`)) return;

    try {
      setActionError("");
      setActionMessage("");

      await axios.delete(
        `${API_URL}/holidays/${holiday.holiday_id}`,
        authConfig
      );

      setActionMessage("Holiday deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          "Unable to delete holiday."
      );
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setActionError("Please select a CSV or Excel file.");
      return;
    }

    try {
      setUploading(true);
      setActionError("");
      setActionMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_URL}/upload`,
        formData,
        {
          ...authConfig,
          headers: {
            ...authConfig.headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setActionMessage(
        response.data?.message ||
          "Attendance file uploaded and processed successfully."
      );

      await loadDashboard();
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          "Attendance upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const generateReport = async () => {
    try {
      setReportLoading(true);
      setActionError("");
      setActionMessage("");

      const response = await axios.get(
        `${API_URL}/api/reports/attendance`,
        authConfig
      );

      setReport(response.data);
      setActionMessage("Attendance report generated successfully.");
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          "Unable to generate attendance report."
      );
    } finally {
      setReportLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      setActionError("");

      const response = await axios.get(
        `${API_URL}/api/reports/export/${type}`,
        {
          ...authConfig,
          responseType: "blob",
        }
      );

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download =
        type === "excel"
          ? "attendance_report.xlsx"
          : "attendance_report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setActionMessage(
        `${type.toUpperCase()} report exported successfully.`
      );
    } catch (err) {
      setActionError(`Unable to export ${type.toUpperCase()} report.`);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const [y, m, d] = text.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    return new Date(value).toLocaleDateString();
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  if (loading) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <h2>Loading Super Admin Dashboard</h2>
          <p>Fetching system-wide attendance and administration data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.errorCard}>
          <h2>Dashboard Unavailable</h2>
          <p>{error}</p>
          <button onClick={loadDashboard} style={styles.primaryButton}>
            Retry
          </button>
          <button onClick={onLogout} style={styles.secondaryButton}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Super Admin Dashboard</h1>
          <p style={styles.subtitle}>
            System-wide attendance analytics and administration
          </p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <strong>{user?.name || "Super Administrator"}</strong>
            <span>{user?.email || ""}</span>
            <span style={styles.roleBadge}>SUPER ADMIN</span>
          </div>

          <button onClick={onLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.container}>
        {actionMessage && (
          <div style={styles.successBanner}>{actionMessage}</div>
        )}

        {actionError && (
          <div style={styles.errorBanner}>{actionError}</div>
        )}

        <div style={styles.actionBar}>
          <div>
            <h2 style={styles.pageHeading}>System Overview</h2>
            <p style={styles.muted}>
              Current organization-wide attendance status
            </p>
          </div>

          <button onClick={loadDashboard} style={styles.primaryButton}>
            Refresh Data
          </button>
        </div>

        <section style={styles.kpiGrid}>
          <MetricCard title="Total Employees" value={summary?.total_employees ?? employees.length} description="Employees in the system" />
          <MetricCard title="Active Employees" value={activeEmployees} description="Currently active" />
          <MetricCard
            title="Workforce Utilization"
            value={`${formatNumber(
              summary?.workforce_utilization
            )}%`}
          />

          <MetricCard
            title="Dropout Rate"
            value={`${formatNumber(
              summary?.dropout_rate
            )}%`}
          />

          <MetricCard
            title="Employee Retention"
            value={`${formatNumber(
              summary?.employee_retention_score
            )}%`}
          />

          <MetricCard title="Departments" value={departments.length} description="Organization departments" />
          <MetricCard title="Attendance Rate" value={`${summary?.attendance_rate ?? 0}%`} description="Overall attendance" />
          <MetricCard title="Present" value={summary?.present ?? presentCount} description="Present records" />
          <MetricCard title="Absent" value={summary?.absent ?? absentCount} description="Absent records" />
          <MetricCard title="Late" value={summary?.late ?? lateCount} description="Late records" />
          <MetricCard title="Total Overtime" value={summary?.total_overtime_hours ?? 0} description="Recorded overtime hours" />
        </section>
        <section style={styles.card}>
  <SectionHeader
    title="System Administration"
    subtitle="Configure KPIs, business rules and system settings"
  />

  <div style={styles.sectionActions}>
    <button
      style={styles.primaryButton}
      onClick={() => {
        setShowAdminSettings((value) => !value);
        if (!adminSettings) loadAdminSettings();
      }}
    >
      {showAdminSettings ? "Hide Configuration" : "Open Configuration"}
    </button>
  </div>

  {showAdminSettings && adminSettings && (
    <div style={styles.formCard}>
      <h3>Business Rules</h3>

      <div style={styles.formGrid}>
        <label>
          Standard Start Time
          <input
            type="time"
            value={adminSettings.standard_start_time}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                standard_start_time: e.target.value,
              })
            }
          />
        </label>

        <label>
          Grace Period (minutes)
          <input
            type="number"
            min="0"
            value={adminSettings.grace_period_minutes}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                grace_period_minutes: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Standard Work Hours
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={adminSettings.standard_work_hours}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                standard_work_hours: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Overtime Threshold Hours
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={adminSettings.overtime_threshold_hours}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                overtime_threshold_hours: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Weekly Hour Cap
          <input
            type="number"
            min="1"
            value={adminSettings.weekly_hour_cap}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                weekly_hour_cap: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Half Day Hours
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={adminSettings.half_day_hours}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                half_day_hours: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Timezone
          <input
            type="text"
            value={adminSettings.timezone}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                timezone: e.target.value,
              })
            }
          />
        </label>
      </div>

      <h3 style={{ marginTop: 24 }}>KPI Configuration</h3>

      {Object.entries(adminSettings.kpis).map(([key, enabled]) => (
        <label
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              setAdminSettings({
                ...adminSettings,
                kpis: {
                  ...adminSettings.kpis,
                  [key]: e.target.checked,
                },
              })
            }
          />
          {key
            .replaceAll("_", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </label>
      ))}

      <div style={styles.sectionActions}>
        <button
          style={styles.primaryButton}
          disabled={settingsSaving}
          onClick={async () => {
            try {
              setSettingsSaving(true);
              setActionError("");

              await axios.put(
                `${API_URL}/api/admin/settings`,
                {
                  standard_start_time: adminSettings.standard_start_time,
                  grace_period_minutes: adminSettings.grace_period_minutes,
                  standard_work_hours: adminSettings.standard_work_hours,
                  overtime_threshold_hours:
                    adminSettings.overtime_threshold_hours,
                  weekly_hour_cap: adminSettings.weekly_hour_cap,
                  half_day_hours: adminSettings.half_day_hours,
                  timezone: adminSettings.timezone,
                },
                authConfig
              );

              await axios.put(
                `${API_URL}/api/admin/kpis`,
                adminSettings.kpis,
                authConfig
              );

              setActionMessage("System configuration saved successfully.");
            } catch (err) {
              setActionError(
                err.response?.data?.detail ||
                  "Unable to save system configuration."
              );
            } finally {
              setSettingsSaving(false);
            }
          }}
        >
          {settingsSaving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  )}
</section>


        <section style={styles.card}>
          <SectionHeader title="Data Management" subtitle="Upload and process attendance data" />
          <div style={styles.managementRow}>
            <label style={styles.uploadButton}>
              {uploading ? "Uploading..." : "Upload CSV / Excel"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
            <span style={styles.muted}>
              Uploading validates and processes attendance data using the configured ETL rules.
            </span>
          </div>
        </section>

        <section style={styles.card}>
          <SectionHeader title="Employee Management" subtitle="Create, update and deactivate employees" />

          <div style={styles.sectionActions}>
            <button
              style={styles.primaryButton}
              onClick={() => {
                resetEmployeeForm();
                setShowEmployeeForm(true);
              }}
            >
              Add Employee
            </button>
          </div>

          {showEmployeeForm && (
            <form onSubmit={handleEmployeeSubmit} style={styles.formCard}>
              <h3>{editingEmployeeId ? "Edit Employee" : "Add Employee"}</h3>

              <div style={styles.formGrid}>
                <FormInput label="Employee Code" value={employeeForm.employee_code} onChange={(v) => setEmployeeForm({ ...employeeForm, employee_code: v })} required />
                <FormInput label="Employee Name" value={employeeForm.employee_name} onChange={(v) => setEmployeeForm({ ...employeeForm, employee_name: v })} required />
                <FormInput label="Email" type="email" value={employeeForm.email} onChange={(v) => setEmployeeForm({ ...employeeForm, email: v })} />
                <div>
                  <label style={styles.label}>Department</label>
                  <select
                    value={employeeForm.department_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department_id: e.target.value })}
                    style={styles.input}
                    required
                  >
                    <option value="">Select department</option>
                    {departmentList.map((d) => (
  <option key={d.department_id} value={d.department_id}>
    {d.department_name}
  </option>
))}
                  </select>
                </div>
                <FormInput label="Designation" value={employeeForm.designation} onChange={(v) => setEmployeeForm({ ...employeeForm, designation: v })} />
                <FormInput label="Joining Date" type="date" value={employeeForm.joining_date} onChange={(v) => setEmployeeForm({ ...employeeForm, joining_date: v })} />
                <div>
                  <label style={styles.label}>Status</label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.primaryButton}>
                  {editingEmployeeId ? "Save Changes" : "Create Employee"}
                </button>
                <button type="button" style={styles.secondaryButton} onClick={resetEmployeeForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <Table>
            <thead>
              <tr>
                <th style={styles.th}>Code</th>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Designation</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.employee_id}>
                  <td style={styles.td}>{employee.employee_code}</td>
                  <td style={styles.td}><strong>{employee.employee_name}</strong></td>
                  <td style={styles.td}>{employee.email || "-"}</td>
                  <td style={styles.td}>{employee.department_name || employee.department_id}</td>
                  <td style={styles.td}>{employee.designation || "-"}</td>
                  <td style={styles.td}><StatusBadge status={employee.status} /></td>
                  <td style={styles.td}>
                    <button style={styles.smallButton} onClick={() => editEmployee(employee)}>Edit</button>
                    {String(employee.status).toLowerCase() === "inactive" ? (
  <button
    style={styles.primaryButton}
    onClick={() => activateEmployee(employee)}
  >
    Activate
  </button>
) : (
  <button
    style={styles.dangerButton}
    onClick={() => deactivateEmployee(employee)}
  >
    Deactivate
  </button>
)}

<button
  style={styles.deleteButton}
  onClick={() => permanentlyDeleteEmployee(employee)}
>
  Delete
</button>
</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>

        <section style={styles.card}>
          <SectionHeader title="Holiday Management" subtitle="Create, edit and remove organization holidays" />

          <button
            style={styles.primaryButton}
            onClick={() => {
              resetHolidayForm();
              setShowHolidayForm(true);
            }}
          >
            Add Holiday
          </button>

          {showHolidayForm && (
            <form onSubmit={handleHolidaySubmit} style={styles.formCard}>
              <h3>{editingHolidayId ? "Edit Holiday" : "Add Holiday"}</h3>

              <div style={styles.formGrid}>
                <FormInput label="Holiday Date" type="date" value={holidayForm.holiday_date} onChange={(v) => setHolidayForm({ ...holidayForm, holiday_date: v })} required />
                <FormInput label="Holiday Name" value={holidayForm.holiday_name} onChange={(v) => setHolidayForm({ ...holidayForm, holiday_name: v })} required />
                <FormInput label="Description" value={holidayForm.description} onChange={(v) => setHolidayForm({ ...holidayForm, description: v })} />
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.primaryButton}>
                  {editingHolidayId ? "Save Changes" : "Create Holiday"}
                </button>
                <button type="button" style={styles.secondaryButton} onClick={resetHolidayForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {holidays.length === 0 ? (
            <EmptyState text="No holidays configured." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Holiday</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr key={holiday.holiday_id}>
                    <td style={styles.td}>{formatDate(holiday.holiday_date)}</td>
                    <td style={styles.td}><strong>{holiday.holiday_name}</strong></td>
                    <td style={styles.td}>{holiday.description || "-"}</td>
                    <td style={styles.td}>
                      <button style={styles.smallButton} onClick={() => editHoliday(holiday)}>Edit</button>
                      <button style={styles.dangerButton} onClick={() => deleteHoliday(holiday)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Department Overview" subtitle="Attendance performance by department" />
          {departments.length === 0 ? (
            <EmptyState text="No department analytics available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Records</th>
                  <th style={styles.th}>Present</th>
                  <th style={styles.th}>Absent</th>
                  <th style={styles.th}>Late</th>
                  <th style={styles.th}>Attendance Rate</th>
                  <th style={styles.th}>Avg Working Hours</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d, i) => (
                  <tr key={d.department_id || i}>
                    <td style={styles.td}><strong>{d.department_name}</strong></td>
                    <td style={styles.td}>{d.total_records ?? 0}</td>
                    <td style={styles.td}>{d.present_count ?? 0}</td>
                    <td style={styles.td}>{d.absent_count ?? 0}</td>
                    <td style={styles.td}>{d.late_count ?? 0}</td>
                    <td style={styles.td}><span style={styles.rateBadge}>{d.attendance_rate ?? 0}%</span></td>
                    <td style={styles.td}>{d.average_working_hours ?? 0} hrs</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Overtime Analytics" subtitle="Overtime by employee" />
          {overtime.length === 0 ? (
            <EmptyState text="No overtime data available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Total Overtime</th>
                  <th style={styles.th}>Average Overtime</th>
                </tr>
              </thead>
              <tbody>
                {overtime.map((row, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{row.employee_name || row.employee_code || "-"}</td>
                    <td style={styles.td}>{row.department_name || "-"}</td>
                    <td style={styles.td}>{row.total_overtime_hours ?? 0} hrs</td>
                    <td style={styles.td}>{row.average_overtime_hours ?? 0} hrs</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Employee Risk" subtitle="Attendance-based employee risk assessment" />
          {risks.length === 0 ? (
            <EmptyState text="No employee risk data available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Attendance Rate</th>
                  <th style={styles.th}>Absent</th>
                  <th style={styles.th}>Late</th>
                  <th style={styles.th}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{r.employee_name || r.employee_code || "-"}</td>
                    <td style={styles.td}>{r.department_name || "-"}</td>
                    <td style={styles.td}>{r.attendance_rate ?? 0}%</td>
                    <td style={styles.td}>{r.absent_count ?? 0}</td>
                    <td style={styles.td}>{r.late_count ?? 0}</td>
                    <td style={styles.td}><StatusBadge status={r.risk_level || "Low"} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Anomalies" subtitle="Attendance records requiring attention" />
          {anomalies.length === 0 ? (
            <EmptyState text="No attendance anomalies detected." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Level</th>
                  <th style={styles.th}>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={a.attendance_id || i}>
                    <td style={styles.td}>{a.employee_name || a.employee_code || "-"}</td>
                    <td style={styles.td}>{formatDate(a.attendance_date)}</td>
                    <td style={styles.td}><StatusBadge status={a.anomaly_level || "-"} /></td>
                    <td style={styles.td}>{(a.anomaly_reasons || []).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Leave Analytics" subtitle="Leave applications by type" />
          {leaveAnalytics.length === 0 ? (
            <EmptyState text="No leave analytics available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Leave Type</th>
                  <th style={styles.th}>Count</th>
                  <th style={styles.th}>Days</th>
                </tr>
              </thead>
              <tbody>
                {leaveAnalytics.map((row, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{row.leave_type || "-"}</td>
                    <td style={styles.td}>{row.count ?? row.total_leaves ?? 0}</td>
                    <td style={styles.td}>{row.total_days ?? row.count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Reports" subtitle="Generate and export attendance reports" />
          <div style={styles.sectionActions}>
            <button style={styles.primaryButton} onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? "Generating..." : "Generate Attendance Report"}
            </button>
            <button style={styles.secondaryButton} onClick={() => exportReport("excel")}>
              Export Excel
            </button>
            <button style={styles.secondaryButton} onClick={() => exportReport("pdf")}>
              Export PDF
            </button>
          </div>

          {report && (
            <div style={styles.reportSummary}>
              <strong>{report.report_type}</strong>
              <span>Total Records: {report.total_records ?? 0}</span>
            </div>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Recent Audit Logs" subtitle="Important system and user activity" />
          {auditLogs.length === 0 ? (
            <EmptyState text="No audit logs available." />
          ) : (
            <Table>
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
                {auditLogs.slice(0, 20).map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{formatDateTime(log.timestamp)}</td>
                    <td style={styles.td}><strong>{log.action || "-"}</strong></td>
                    <td style={styles.td}>{log.module || "-"}</td>
                    <td style={styles.td}>{log.resource || "-"}</td>
                    <td style={styles.td}><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section style={styles.card}>
          <SectionHeader title="Recent Attendance Records" subtitle="Latest attendance activity" />
          {attendance.length === 0 ? (
            <EmptyState text="No attendance records available." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Working Hours</th>
                  <th style={styles.th}>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 20).map((r, i) => (
                  <tr key={r.attendance_id || i}>
                    <td style={styles.td}>{r.employee_name || "-"}</td>
                    <td style={styles.td}>{r.employee_code || "-"}</td>
                    <td style={styles.td}>{r.department_name || "-"}</td>
                    <td style={styles.td}>{formatDate(r.attendance_date)}</td>
                    <td style={styles.td}><StatusBadge status={r.status} /></td>
                    <td style={styles.td}>{r.working_hours ?? 0}</td>
                    <td style={styles.td}>{r.overtime_hours ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
      </main>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </div>
  );
}

function MetricCard({ title, value, description }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricTitle}>{title}</p>
      <h2 style={styles.metricValue}>{value}</h2>
      <p style={styles.metricDescription}>{description}</p>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.sectionSubtitle}>{subtitle}</p>
    </div>
  );
}

function Table({ children }) {
  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>{children}</table>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}

function StatusBadge({ status }) {
  const value = String(status || "-");
  const normalized = value.toLowerCase();

  let background = "#e5e7eb";
  let color = "#374151";

  if (
    ["active", "present", "approved", "success", "low", "low risk"].includes(normalized)
  ) {
    background = "#dcfce7";
    color = "#166534";
  }

  if (
    ["inactive", "absent", "rejected", "failed", "high", "high risk"].includes(normalized)
  ) {
    background = "#fee2e2";
    color = "#991b1b";
  }

  if (
    ["late", "pending", "medium", "medium risk"].includes(normalized)
  ) {
    background = "#fef3c7";
    color = "#92400e";
  }

  return (
    <span style={{
      display: "inline-block",
      padding: "5px 10px",
      borderRadius: "999px",
      background,
      color,
      fontSize: "12px",
      fontWeight: 700,
    }}>
      {value}
    </span>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#1f2937",
    fontFamily: "Inter, Arial, sans-serif",
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
  subtitle: { margin: "7px 0 0", color: "#cbd5e1" },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    alignItems: "flex-end",
  },

  roleBadge: {
    marginTop: "3px",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#2563eb",
    color: "#fff",
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

  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
  },

  pageHeading: { margin: 0, fontSize: "24px" },
  muted: { margin: "5px 0 0", color: "#64748b" },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },

  metricCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
    border: "1px solid #e5e7eb",
  },

  metricTitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
  },

  metricValue: {
    margin: "10px 0 4px",
    fontSize: "30px",
    color: "#111827",
  },

  metricDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
  },

  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
    border: "1px solid #e5e7eb",
  },

  sectionHeader: { marginBottom: "18px" },
  sectionTitle: { margin: 0, fontSize: "20px" },
  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  managementRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  uploadButton: {
    display: "inline-block",
    border: "none",
    borderRadius: "8px",
    padding: "10px 17px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  sectionActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  formCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "20px",
    margin: "18px 0",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "18px",
    flexWrap: "wrap",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
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
    marginLeft: "0",
  },

  smallButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    padding: "6px 10px",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 600,
    marginRight: "8px",
  },

  deleteButton: {
    border: "1px solid #991b1b",
    borderRadius: "6px",
    padding: "6px 10px",
    background: "#fff",
    color: "#991b1b",
    cursor: "pointer",
    fontWeight: 700,
    marginLeft: "6px",
  },

  dangerButton: {
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },

  successBanner: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontWeight: 600,
  },

  errorBanner: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontWeight: 600,
  },

  reportSummary: {
    display: "flex",
    gap: "20px",
    marginTop: "16px",
    padding: "15px",
    background: "#f8fafc",
    borderRadius: "8px",
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

  rateBadge: {
    display: "inline-block",
    padding: "4px 9px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: "12px",
  },

  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "8px",
  },

  centerScreen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f7fb",
    padding: "20px",
  },

  loadingCard: {
    background: "#fff",
    padding: "40px",
    borderRadius: "14px",
    textAlign: "center",
    boxShadow: "0 5px 25px rgba(0,0,0,0.08)",
  },

  spinner: {
    width: "35px",
    height: "35px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    margin: "0 auto 20px",
  },

  errorCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "14px",
    maxWidth: "500px",
    textAlign: "center",
    boxShadow: "0 5px 25px rgba(0,0,0,0.08)",
  },
};
