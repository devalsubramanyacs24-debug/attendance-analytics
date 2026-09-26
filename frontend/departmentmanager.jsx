import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function DepartmentManagerDashboard({
  user,
  token,
  onLogout,
}) {
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [risks, setRisks] = useState([]);
  const [trends, setTrends] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  // AI Insights (department-scoped by the backend for Department Managers)
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const getParams = () => {
    const params = {};

    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

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

      setAiInsights(response.data?.insights || null);
    } catch (err) {
      // AI insights may not exist until they are generated.
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

      setAiInsights(response.data?.insights || null);
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

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const params = getParams();

      const results = await Promise.allSettled([
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

        axios.get(`${API_URL}/analytics/overtime`, {
          ...headers,
          params,
        }),

        axios.get(`${API_URL}/analytics/anomalies`, {
          ...headers,
          params,
        }),
      ]);

      const [
        summaryResult,
        departmentResult,
        riskResult,
        trendsResult,
        attendanceResult,
        leaveResult,
        overtimeResult,
        anomalyResult,
      ] = results;

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

      const failed = results.filter(
        (result) => result.status === "rejected"
      );

      if (failed.length === results.length) {
        throw new Error(
          "Unable to load department manager data."
        );
      }

      // AI is supplementary, so it must not prevent the dashboard
      // from loading if no generated insight exists yet.
      loadAIInsights();
    } catch (err) {
      console.error(
        "Department Manager dashboard error:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setError(
          "You do not have permission to access this dashboard."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
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

  const department = departments[0] || {};

  const filteredAttendance = attendance;

  const filteredRisks = risks;

  const presentCount = filteredAttendance.filter(
    (item) => item.status === "Present"
  ).length;

  const absentCount = filteredAttendance.filter(
    (item) => item.status === "Absent"
  ).length;

  const lateCount = filteredAttendance.filter(
    (item) => item.status === "Late"
  ).length;

  const formatNumber = (value) =>
    Number(value || 0).toFixed(2);

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>

          <h2>Loading Department Dashboard</h2>

          <p>
            Fetching your department's attendance data...
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
            Department Manager Dashboard
          </h1>

          <p style={styles.subtitle}>
            Department attendance and employee performance
          </p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <strong>
              {user?.name || "Department Manager"}
            </strong>

            <span>
              {user?.email || ""}
            </span>

            <span style={styles.roleBadge}>
              DEPARTMENT MANAGER
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

        {/* DEPARTMENT HEADER */}

        <section style={styles.departmentCard}>

          <div>
            <span style={styles.smallLabel}>
              YOUR DEPARTMENTS
            </span>

            <h2 style={styles.departmentName}>
              {departments.length > 0
                ? departments
                    .map((item) => item.department_name)
                    .filter(Boolean)
                    .join(" + ")
                : user?.department_name ||
                  "My Departments"}
            </h2>

            <p style={styles.muted}>
              Department managers can view
              department-level attendance and
              employee performance.
            </p>
          </div>

          <div style={styles.departmentStats}>

            <div>
              <span>Records</span>
              <strong>
                {summary?.attendance_records ??
                  attendance.length}
              </strong>
            </div>

            <div>
              <span>Attendance</span>
              <strong>
                {summary?.attendance_rate ??
                  0}
                %
              </strong>
            </div>

          </div>

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
                trends, and recommended actions for your department
              </p>
            </div>

            <div style={styles.aiActions}>
              <button
                style={styles.primaryButton}
                onClick={generateAIInsights}
                disabled={aiLoading}
              >
                {aiLoading
                  ? "Generating..."
                  : "Generate AI Insights"}
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
            <div style={styles.aiError}>
              {aiError}
            </div>
          )}

          {aiLoading && !aiInsights ? (
            <EmptyState text="Generating department AI insights..." />
          ) : !aiInsights ? (
            <EmptyState text="No AI insights available yet. Generate insights to analyze your department." />
          ) : (
            <div style={styles.aiGrid}>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Attendance Health
                </h3>
                <div style={styles.aiText}>
  {aiInsights.attendance_health ? (
    <>
      <strong>{aiInsights.attendance_health.status}</strong>
      <div style={{ marginTop: "8px" }}>
        {aiInsights.attendance_health.explanation}
      </div>
    </>
  ) : aiInsights.attendanceHealth ? (
    <>
      <strong>{aiInsights.attendanceHealth.status}</strong>
      <div style={{ marginTop: "8px" }}>
        {aiInsights.attendanceHealth.explanation}
      </div>
    </>
  ) : aiInsights.health ? (
    typeof aiInsights.health === "string"
      ? aiInsights.health
      : (
        <>
          <strong>{aiInsights.health.status}</strong>
          <div style={{ marginTop: "8px" }}>
            {aiInsights.health.explanation}
          </div>
        </>
      )
  ) : (
    "No attendance health summary available."
  )}
</div>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Risk Departments
                </h3>

                {Array.isArray(aiInsights.risk_departments) &&
                aiInsights.risk_departments.length > 0 ? (
                  <ul style={styles.aiList}>
                    {aiInsights.risk_departments.map(
                      (item, index) => (
                        <li key={index}>
                          {typeof item === "string"
                            ? item
                            : item.department_name ??
                              item.department ??
                              item.name ??
                              JSON.stringify(item)}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p style={styles.aiText}>
                    {aiInsights.risk_departments ??
                      "No department risk identified."}
                  </p>
                )}
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Trend Analysis
                </h3>
                <p style={styles.aiText}>
                  {aiInsights.trend_analysis ??
                    aiInsights.trendAnalysis ??
                    aiInsights.trends ??
                    "No trend analysis available."}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Recommendations
                </h3>

                {Array.isArray(aiInsights.recommendations) &&
                aiInsights.recommendations.length > 0 ? (
                  <ul style={styles.aiList}>
                    {aiInsights.recommendations.map(
                      (item, index) => (
                        <li key={index}>
                          {typeof item === "string"
                            ? item
                            : item.recommendation ??
                              item.action ??
                              item.text ??
                              JSON.stringify(item)}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p style={styles.aiText}>
                    No recommendations available.
                  </p>
                )}
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Actionable Insights
                </h3>

                {Array.isArray(aiInsights.actionable_insights) &&
                aiInsights.actionable_insights.length > 0 ? (
                  <ul style={styles.aiList}>
                    {aiInsights.actionable_insights.map(
                      (item, index) => (
                        <li key={index}>
                          {typeof item === "string"
                            ? item
                            : item.insight ??
                              item.action ??
                              item.text ??
                              JSON.stringify(item)}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p style={styles.aiText}>
                    {aiInsights.summary ??
                      aiInsights.executive_summary ??
                      "No additional actionable insights available."}
                  </p>
                )}
              </div>

            </div>
          )}

        </section>

        {/* KPIs */}

        <section style={styles.kpiGrid}>

          <MetricCard
            title="Attendance Rate"
            value={`${formatNumber(
              summary?.attendance_rate ??
                department.attendance_rate
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
            title="Average Working Hours"
            value={formatNumber(
              summary?.average_working_hours ??
                department.average_working_hours
            )}
          />

          <MetricCard
            title="Overtime Hours"
            value={formatNumber(
              summary?.total_overtime_hours
            )}
          />

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

        </section>

        {/* ATTENDANCE TREND */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Trend"
            subtitle="Attendance movement for your department"
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
            subtitle="Employees in your department requiring attention"
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
                    Attendance %
                  </th>

                  <th style={styles.th}>
                    Absent
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

        {/* LEAVE */}

        <section style={styles.card}>

          <SectionHeader
            title="Leave Overview"
            subtitle="Leave information available for the department"
          />

          {leaves.length === 0 ? (
            <EmptyState text="No leave data available." />
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
            title="Overtime"
            subtitle="Overtime recorded within the department"
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

        {/* ATTENDANCE RECORDS */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Records"
            subtitle="Attendance records for your department"
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
                    Date
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Working Hours
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

        {/* ANOMALIES */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Anomalies"
            subtitle="Unusual attendance patterns"
          />

          {anomalies.length === 0 ? (
            <EmptyState text="No anomalies detected." />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Employee
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

      </main>
    </div>
  );
}


/* =========================
   COMPONENTS
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

  if (lower === "present") {
    background = "#dcfce7";
    color = "#166534";
  }

  if (lower === "absent") {
    background = "#fee2e2";
    color = "#991b1b";
  }

  if (lower === "late") {
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
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.06)",
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

  departmentCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
    flexWrap: "wrap",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.06)",
  },

  smallLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
  },

  departmentName: {
    margin: "6px 0",
    fontSize: "26px",
  },

  muted: {
    margin: 0,
    color: "#64748b",
  },

  departmentStats: {
    display: "flex",
    gap: "35px",
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
    minWidth: "750px",
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
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
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
};