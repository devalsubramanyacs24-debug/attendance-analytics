import React, { useEffect, useState } from "react";
import Reports from "./reports";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";  

const API_BASE = "http://127.0.0.1:8000";

export default function DataAnalystDashboard({ user, token, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [risks, setRisks] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [trends, setTrends] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [employeeAnalytics, setEmployeeAnalytics] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtime, setOvertime] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const buildParams = () => {
  const params = {};

  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (department) params.department = department;

  return params;
};

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const params = buildParams();

      const [
  summaryResponse,
  departmentsResponse,
  risksResponse,
  anomaliesResponse,
  trendsResponse,
  attendanceResponse,
  employeeAnalyticsResponse,
  forecastResponse,
  leaveResponse,
  overtimeResponse,
] = await Promise.all([
        axios.get(`${API_BASE}/analytics/summary`, {
          headers,
          params,
        }),

        axios.get(`${API_BASE}/analytics/departments`, {
          headers,
          params,
        }),

        axios.get(`${API_BASE}/analytics/employee-risk`, {
          headers,
          params,
        }),

        axios.get(`${API_BASE}/analytics/anomalies`, {
          headers,
          params,
        }),

        axios.get(`${API_BASE}/analytics/trends`, {
          headers,
          params,
        }),

        axios.get(`${API_BASE}/attendance`, {
          headers,
          params,
        }),
        axios.get(`${API_BASE}/analytics/employee`, {
  headers,
  params: {
    ...params,
    department: department || undefined,
  },
}),
axios.get(`${API_BASE}/analytics/forecast`, {
  headers,
  params,
}),
axios.get(`${API_BASE}/analytics/leave`, {
  headers,
  params,
}),
axios.get(`${API_BASE}/analytics/overtime`, {
  headers,
  params,
}),
      ]);

      setSummary(summaryResponse.data);
      setDepartments(departmentsResponse.data);
      setRisks(risksResponse.data);
      setAnomalies(anomaliesResponse.data?.anomalies || []);
      setTrends(trendsResponse.data);
      setAttendance(attendanceResponse.data);
      setEmployeeAnalytics(employeeAnalyticsResponse.data);
      setForecast(forecastResponse.data);
      setLeaves(leaveResponse.data);
      setOvertime(overtimeResponse.data);
    } catch (err) {
      console.error("Data Analyst dashboard error:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to access this dashboard.");
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load dashboard data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const filteredDepartments = department
    ? departments.filter(
        (item) => item.department_name === department
      )
    : departments;

  const filteredAttendance = department
    ? attendance.filter(
        (item) => item.department_name === department
      )
    : attendance;

  const departmentNames = [
    ...new Set(
      departments
        .map((item) => item.department_name)
        .filter(Boolean)
    ),
  ];

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setDepartment("");
  };

  const formatNumber = (value) => {
    return Number(value || 0).toFixed(2);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Data Analyst Dashboard</h1>
          <p style={styles.subtitle}>
            Attendance analytics, trends and workforce insights
          </p>
        </div>

        <div style={styles.headerRight}>
          <span style={styles.userName}>
            {user?.name || "Data Analyst"}
          </span>

          <button style={styles.logoutButton} onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.container}>

        {/* FILTERS */}
        <section style={styles.filterCard}>
          <div>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={styles.input}
            >
              <option value="">All Departments</option>

              {departmentNames.map((name) => (
                <option key={name} value={name}>
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

        {loading && (
          <div style={styles.message}>
            Loading analytics...
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {!loading && !error && summary && (
          <>
            {/* KPI CARDS */}
            <section style={styles.grid}>
              <MetricCard
                title="Total Employees"
                value={summary.total_employees}
              />

              <MetricCard
                title="Attendance Records"
                value={
                  summary.total_attendance_records ??
                  summary.attendance_records ??
                  0
                }
              />

              <MetricCard
                title="Attendance Rate"
                value={`${formatNumber(summary.attendance_rate)}%`}
              />

              <MetricCard
                title="Present"
                value={
                  summary.present_count ??
                  summary.present ??
                  0
                }
              />

              <MetricCard
                title="Absent"
                value={
                  summary.absent_count ??
                  summary.absent ??
                  0
                }
              />

              <MetricCard
                title="Late"
                value={
                  summary.late_count ??
                  summary.late ??
                  0
                }
              />

              <MetricCard
                title="Avg Working Hours"
                value={formatNumber(summary.average_working_hours)}
              />

              <MetricCard
                title="Total Overtime"
                value={formatNumber(summary.total_overtime_hours)}
              />
              <MetricCard
                title="Workforce Utilization"
                value={`${formatNumber(summary.workforce_utilization)}%`}
              />

              <MetricCard
                title="Dropout Rate"
                value={`${formatNumber(summary.dropout_rate)}%`}
              />

              <MetricCard
                title="Employee Retention"
                value={`${formatNumber(summary.employee_retention_score)}%`}
              />

            </section>

            {/* DEPARTMENT ANALYTICS */}
            <section style={styles.card}>
              <SectionTitle title="Department Analytics" />

              {filteredDepartments.length === 0 ? (
                <p>No department data available.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Department</th>
                        <th style={styles.th}>Records</th>
                        <th style={styles.th}>Present</th>
                        <th style={styles.th}>Absent</th>
                        <th style={styles.th}>Late</th>
                        <th style={styles.th}>Attendance %</th>
                        <th style={styles.th}>Avg Hours</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredDepartments.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.td}>
                            {item.department_name}
                          </td>
                          <td style={styles.td}>
                            {item.total_records}
                          </td>
                          <td style={styles.td}>
                            {item.present_count}
                          </td>
                          <td style={styles.td}>
                            {item.absent_count}
                          </td>
                          <td style={styles.td}>
                            {item.late_count}
                          </td>
                          <td style={styles.td}>
                            {formatNumber(item.attendance_rate)}%
                          </td>
                          <td style={styles.td}>
                            {formatNumber(item.average_working_hours)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ATTENDANCE TRENDS */}
            <section style={styles.card}>
              <SectionTitle title="Attendance Trends" />
              <div style={{ width: "100%", height: 320, marginBottom: "24px" }}>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={trends}>
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis
        dataKey="attendance_date"
      />

      <YAxis
        domain={[0, 100]}
        unit="%"
      />

      <Tooltip />

      <Line
        type="monotone"
        dataKey="attendance_rate"
        name="Attendance Rate"
        strokeWidth={3}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

              {trends.length === 0 ? (
                <p>No trend data available.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Records</th>
                        <th style={styles.th}>Present</th>
                        <th style={styles.th}>Absent</th>
                        <th style={styles.th}>Late</th>
                        <th style={styles.th}>Attendance %</th>
                      </tr>
                    </thead>

                    <tbody>
                      {trends.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.td}>
                            {String(item.attendance_date)}
                          </td>
                          <td style={styles.td}>
                            {item.total_records}
                          </td>
                          <td style={styles.td}>
                            {item.present_count}
                          </td>
                          <td style={styles.td}>
                            {item.absent_count}
                          </td>
                          <td style={styles.td}>
                            {item.late_count}
                          </td>
                          <td style={styles.td}>
                            {formatNumber(item.attendance_rate)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* EMPLOYEE RISK */}
            <section style={styles.card}>
              <SectionTitle title="Employee Attendance Risk" />

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Attendance %</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Late</th>
                      <th style={styles.th}>Risk</th>
                    </tr>
                  </thead>

                  <tbody>
                    {risks.map((item, index) => (
                      <tr key={index}>
                        <td style={styles.td}>
                          {item.employee_name}
                        </td>

                        <td style={styles.td}>
                          {item.department_name}
                        </td>

                        <td style={styles.td}>
                          {formatNumber(item.attendance_rate)}%
                        </td>

                        <td style={styles.td}>
                          {item.absent_count}
                        </td>

                        <td style={styles.td}>
                          {item.late_count}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(item.risk_level === "High"
                                ? styles.highRisk
                                : item.risk_level === "Medium"
                                ? styles.mediumRisk
                                : styles.lowRisk),
                            }}
                          >
                            {item.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {/* ATTENDANCE FORECAST */}

<section style={styles.card}>
  <SectionTitle title="Attendance Forecast" />

  {!forecast ? (
    <p>No forecast data available.</p>
  ) : (
    <div style={styles.grid}>

      <MetricCard
        title="Predicted Attendance"
        value={`${formatNumber(
          forecast.predicted_attendance_rate
        )}%`}
      />

      <MetricCard
        title="Forecast Period"
        value={
          forecast.forecast_period ||
          "Next Period"
        }
      />

      <MetricCard
        title="Forecast Status"
        value={
          forecast.status ||
          "Available"
        }
      />

    </div>
  )}
</section>
            {/* EMPLOYEE ANALYTICS */}

<section style={styles.card}>
  <SectionTitle title="Employee Analytics" />

  {employeeAnalytics.length === 0 ? (
    <p>No employee analytics available.</p>
  ) : (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Employee</th>
            <th style={styles.th}>Code</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Records</th>
            <th style={styles.th}>Present</th>
            <th style={styles.th}>Absent</th>
            <th style={styles.th}>Late</th>
            <th style={styles.th}>Attendance %</th>
            <th style={styles.th}>Avg Hours</th>
            <th style={styles.th}>Overtime</th>
            <th style={styles.th}>Late Minutes</th>
            <th style={styles.th}>Risk</th>
          </tr>
        </thead>

        <tbody>
          {employeeAnalytics.map((item, index) => (
            <tr key={index}>

              <td style={styles.td}>
                {item.employee_name}
              </td>

              <td style={styles.td}>
                {item.employee_code}
              </td>

              <td style={styles.td}>
                {item.department_name}
              </td>

              <td style={styles.td}>
                {item.total_records}
              </td>

              <td style={styles.td}>
                {item.present_count}
              </td>

              <td style={styles.td}>
                {item.absent_count}
              </td>

              <td style={styles.td}>
                {item.late_count}
              </td>

              <td style={styles.td}>
                {formatNumber(item.attendance_rate)}%
              </td>

              <td style={styles.td}>
                {formatNumber(item.average_working_hours)}
              </td>

              <td style={styles.td}>
                {formatNumber(item.total_overtime_hours)}
              </td>

              <td style={styles.td}>
                {item.total_late_minutes || 0}
              </td>

              <td style={styles.td}>
                <span
                  style={{
                    ...styles.badge,
                    ...(item.risk_level === "High"
                      ? styles.highRisk
                      : item.risk_level === "Medium"
                      ? styles.mediumRisk
                      : styles.lowRisk),
                  }}
                >
                  {item.risk_level}
                </span>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
{/* LEAVE ANALYTICS */}

<section style={styles.card}>
  <SectionTitle title="Leave Analytics" />

  {leaves.length === 0 ? (
    <p>No leave data available.</p>
  ) : (
    <>
      <div
        style={{
          width: "100%",
          height: 300,
          marginBottom: "24px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leaves}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="leave_type" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="count"
              name="Leave Count"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Leave Type</th>
              <th style={styles.th}>Total Leaves</th>
            </tr>
          </thead>

          <tbody>
            {leaves.map((item, index) => (
              <tr key={index}>
                <td style={styles.td}>
                  {item.leave_type}
                </td>

                <td style={styles.td}>
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</section>
{/* OVERTIME ANALYTICS */}

<section style={styles.card}>
  <SectionTitle title="Overtime Analytics" />

  {overtime.length === 0 ? (
    <p>No overtime data available.</p>
  ) : (
    <>
      <div
        style={{
          width: "100%",
          height: 300,
          marginBottom: "24px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={overtime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="employee_name" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="total_overtime_hours"
              name="Overtime Hours"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Employee Code</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Total Overtime Hours</th>
              <th style={styles.th}>Average Overtime Hours</th>
            </tr>
          </thead>

          <tbody>
            {overtime.map((item, index) => (
              <tr key={item.employee_code || index}>
                <td style={styles.td}>
                  {item.employee_name || "-"}
                </td>

                <td style={styles.td}>
                  {item.employee_code || "-"}
                </td>

                <td style={styles.td}>
                  {item.department_name || "-"}
                </td>

                <td style={styles.td}>
                  {formatNumber(item.total_overtime_hours)}
                </td>

                <td style={styles.td}>
                  {formatNumber(item.average_overtime_hours)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</section>

            {/* ANOMALIES */}
            <section style={styles.card}>
              <SectionTitle title="Attendance Anomalies" />

              {anomalies.length === 0 ? (
                <p>No attendance anomalies detected.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Employee</th>
                        <th style={styles.th}>Department</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Working Hours</th>
                        <th style={styles.th}>Late Minutes</th>
                        <th style={styles.th}>Reason</th>
                      </tr>
                    </thead>

                    <tbody>
                      {anomalies.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.td}>
                            {item.employee_name}
                          </td>

                          <td style={styles.td}>
                            {item.department_name}
                          </td>

                          <td style={styles.td}>
                            {String(item.attendance_date)}
                          </td>

                          <td style={styles.td}>
                            {item.status}
                          </td>

                          <td style={styles.td}>
                            {formatNumber(item.working_hours)}
                          </td>

                          <td style={styles.td}>
                            {item.late_minutes || 0}
                          </td>

                          <td style={styles.td}>
                            {(item.anomaly_reasons || []).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ATTENDANCE RECORDS */}
            <section style={styles.card}>
              <SectionTitle title="Attendance Records" />

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
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
                    {filteredAttendance.slice(0, 100).map((item, index) => (
                      <tr key={index}>
                        <td style={styles.td}>
                          {item.employee_name}
                        </td>

                        <td style={styles.td}>
                          {item.employee_code}
                        </td>

                        <td style={styles.td}>
                          {item.department_name}
                        </td>

                        <td style={styles.td}>
                          {String(item.attendance_date)}
                        </td>

                        <td style={styles.td}>
                          {item.status}
                        </td>

                        <td style={styles.td}>
                          {formatNumber(item.working_hours)}
                        </td>

                        <td style={styles.td}>
                          {formatNumber(item.overtime_hours)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAttendance.length > 100 && (
                <p style={styles.note}>
                  Showing the first 100 records.
                </p>
              )}
            </section>
          </>
        )}
        <section style={styles.card}>
          <Reports token={token} />
        </section>

      </main>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTitle}>{title}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function SectionTitle({ title }) {
  return <h2 style={styles.sectionTitle}>{title}</h2>;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#1f2937",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  header: {
    background: "#111827",
    color: "white",
    padding: "22px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  title: {
  margin: 0,
  fontSize: "28px",
  color: "#f8fafc",
},

  subtitle: {
    margin: "6px 0 0",
    opacity: 0.75,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  userName: {
    fontWeight: 600,
  },

  logoutButton: {
    border: "none",
    borderRadius: "7px",
    padding: "9px 15px",
    cursor: "pointer",
    background: "#ef4444",
    color: "white",
    fontWeight: 600,
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "28px",
  },

  filterCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "24px",
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "end",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
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
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    background: "white",
  },

  primaryButton: {
    padding: "10px 17px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    background: "#2563eb",
    color: "white",
    fontWeight: 600,
  },

  secondaryButton: {
    padding: "10px 17px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    cursor: "pointer",
    background: "white",
    fontWeight: 600,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  metricCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },

  metricTitle: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "10px",
  },

  metricValue: {
    fontSize: "28px",
    fontWeight: 700,
  },

  card: {
    background: "white",
    padding: "22px",
    borderRadius: "12px",
    marginBottom: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "20px",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "800px",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f3f4f6",
    borderBottom: "1px solid #d1d5db",
    fontSize: "13px",
  },

  td: {
    padding: "11px 12px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "4px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },

  highRisk: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  mediumRisk: {
    background: "#fef3c7",
    color: "#92400e",
  },

  lowRisk: {
    background: "#dcfce7",
    color: "#166534",
  },

  message: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  note: {
    color: "#6b7280",
    fontSize: "13px",
  },
};