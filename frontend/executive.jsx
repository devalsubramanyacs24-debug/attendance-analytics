import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function ExecutiveDashboard({
  user,
  token,
  onLogout,
}) {
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");

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
    try {
      setAiLoading(true);
      setAiError("");

      const result = await axios.get(
        `${API_URL}/api/ai/insights`,
        {
          ...headers,
          params: getParams(),
        }
      );

      setAiInsights(result.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setAiError(
          "No AI insights have been generated yet. Generate insights from the AI endpoint first."
        );
      } else if (err.response?.status === 401) {
        setAiError(
          "Your session has expired. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setAiError(
          "You do not have permission to access AI insights."
        );
      } else {
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
    try {
      setAiLoading(true);
      setAiError("");

      const result = await axios.post(
        `${API_URL}/api/ai/generate`,
        null,
        {
          ...headers,
          params: getParams(),
        }
      );

      setAiInsights(result.data);
    } catch (err) {
      setAiError(
        err.response?.data?.detail ||
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

        axios.get(`${API_URL}/analytics/trends`, {
          ...headers,
          params,
        }),
      ]);

      const [
        summaryResult,
        departmentResult,
        trendsResult,
      ] = results;

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
      }

      if (departmentResult.status === "fulfilled") {
        setDepartments(
          departmentResult.value.data || []
        );
      }

      if (trendsResult.status === "fulfilled") {
        setTrends(
          trendsResult.value.data || []
        );
      }

      // AI is supplementary to the executive dashboard.
      // A missing AI result must not prevent the dashboard from loading.
      loadAIInsights();

      if (
        results.every(
          (result) =>
            result.status === "rejected"
        )
      ) {
        throw new Error(
          "Unable to load executive analytics."
        );
      }
    } catch (err) {
      console.error(
        "Executive dashboard error:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setError(
          "You do not have permission to access the Executive dashboard."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Unable to load executive dashboard."
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

  const formatNumber = (value) =>
    Number(value || 0).toFixed(2);

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      return new Date(
        value
      ).toLocaleDateString();
    } catch {
      return String(value);
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setDepartment("");
  };

  /*
   * Calculate the department with the highest
   * and lowest attendance rate.
   */
  const sortedDepartments = [
    ...departments,
  ].sort(
    (a, b) =>
      Number(b.attendance_rate || 0) -
      Number(a.attendance_rate || 0)
  );

  const bestDepartment =
    sortedDepartments[0];

  const lowestDepartment =
    sortedDepartments[
      sortedDepartments.length - 1
    ];

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>

          <h2>
            Loading Executive Dashboard
          </h2>

          <p>
            Preparing organization-wide performance insights...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <h2>
            Dashboard Unavailable
          </h2>

          <p>{error}</p>

          <div>
            <label style={styles.label}>
              Department
            </label>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={styles.input}
            >
              <option value="">All Departments</option>
              {[...new Set(
                departments
                  .map((item) => item.department_name)
                  .filter(Boolean)
              )].map((name) => (
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
            Executive Dashboard
          </h1>

          <p style={styles.subtitle}>
            Organization-wide attendance performance and management insights
          </p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <strong>
              {user?.name || "Executive"}
            </strong>

            <span>
              {user?.email || ""}
            </span>

            <span style={styles.roleBadge}>
              EXECUTIVE
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
                setStartDate(
                  e.target.value
                )
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
                setEndDate(
                  e.target.value
                )
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

        {/* EXECUTIVE KPIs */}

        <section style={styles.kpiGrid}>

          <MetricCard
            title="Total Employees"
            value={
              summary?.total_employees ??
              0
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
              (summary?.present ??
              summary?.present ??
              0)
            }
          />

          <MetricCard
            title="Absent"
            value={
              (summary?.absent ??
              summary?.absent ??
              0)
            }
          />

          <MetricCard
            title="Late"
            value={
              (summary?.late ??
              summary?.late ??
              0)
            }
          />

          <MetricCard
            title="Average Working Hours"
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

          <MetricCard
            title="Departments"
            value={departments.length}
          />

        </section>

        {/* MANAGEMENT SNAPSHOT */}

        <section style={styles.card}>

          <SectionHeader
            title="Management Snapshot"
            subtitle="Key organizational performance indicators"
          />

          <div style={styles.snapshotGrid}>

            <SnapshotCard
              title="Best Performing Department"
              value={
                bestDepartment
                  ?.department_name ||
                "No data"
              }
              detail={
                bestDepartment
                  ? `${bestDepartment.attendance_rate ?? 0}% attendance`
                  : ""
              }
            />

            <SnapshotCard
              title="Lowest Attendance Department"
              value={
                lowestDepartment
                  ?.department_name ||
                "No data"
              }
              detail={
                lowestDepartment
                  ? `${lowestDepartment.attendance_rate ?? 0}% attendance`
                  : ""
              }
            />

            <SnapshotCard
              title="Present Workforce"
              value={
                summary?.present ??
                0
              }
              detail="Attendance records marked present"
            />

            <SnapshotCard
              title="Absence Count"
              value={
                summary?.absent ??
                0
              }
              detail="Attendance records marked absent"
            />

          </div>

        </section>

        {/* DEPARTMENT COMPARISON */}

        <section style={styles.card}>

          <SectionHeader
            title="Department Performance"
            subtitle="Organization-wide department comparison"
          />

          {departments.length === 0 ? (
            <EmptyState
              text="No department analytics available."
            />
          ) : (
            <Table>

              <thead>
                <tr>
                  <th style={styles.th}>
                    Department
                  </th>

                  <th style={styles.th}>
                    Attendance %
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
                    Avg Working Hours
                  </th>

                  <th style={styles.th}>
                    Performance
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedDepartments.map(
                  (item, index) => {

                    const rate =
                      Number(
                        item.attendance_rate ||
                          0
                      );

                    return (
                      <tr key={index}>

                        <td style={styles.td}>
                          <strong>
                            {
                              item.department_name
                            }
                          </strong>
                        </td>

                        <td style={styles.td}>
                          {formatNumber(
                            rate
                          )}
                          %
                        </td>

                        <td style={styles.td}>
                          {
                            item.present_count ??
                            0
                          }
                        </td>

                        <td style={styles.td}>
                          {
                            item.absent_count ??
                            0
                          }
                        </td>

                        <td style={styles.td}>
                          {
                            item.late_count ??
                            0
                          }
                        </td>

                        <td style={styles.td}>
                          {formatNumber(
                            item.average_working_hours
                          )}
                        </td>

                        <td style={styles.td}>
                          <PerformanceBadge
                            rate={rate}
                          />
                        </td>

                      </tr>
                    );
                  }
                )}
              </tbody>

            </Table>
          )}

        </section>

        {/* ATTENDANCE TREND */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Trend"
            subtitle="Organization-wide attendance movement"
          />

          {trends.length === 0 ? (
            <EmptyState
              text="No trend data available."
            />
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
                        {
                          item.total_records ??
                          0
                        }
                      </td>

                      <td style={styles.td}>
                        {
                          item.present_count ??
                          0
                        }
                      </td>

                      <td style={styles.td}>
                        {
                          item.absent_count ??
                          0
                        }
                      </td>

                      <td style={styles.td}>
                        {
                          item.late_count ??
                          0
                        }
                      </td>

                      <td style={styles.td}>
                        {formatNumber(
                          item.attendance_rate
                        )}
                        %
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </Table>
          )}

        </section>

        {/* AI INSIGHTS */}

        <section style={styles.card}>

          <SectionHeader
            title="AI Insights"
            subtitle="AI-generated executive attendance health, risks, trends and recommendations"
          />

          <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
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

          {aiError ? (
            <div style={styles.aiError}>
              {aiError}
            </div>
          ) : aiInsights?.insights ? (
            <div style={styles.aiGrid}>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Executive Summary
                </h3>
                <p style={styles.aiText}>
                  {aiInsights.insights.executive_summary ||
                    "No summary available."}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Attendance Health
                </h3>

                <strong>
                  {aiInsights.insights.attendance_health?.status ||
                    "Unavailable"}
                </strong>

                <p style={styles.aiText}>
                  {aiInsights.insights.attendance_health?.explanation ||
                    ""}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Risk Departments
                </h3>

                {(
                  aiInsights.insights.risk_departments || []
                ).length === 0 ? (
                  <p style={styles.aiText}>
                    No department risks identified.
                  </p>
                ) : (
                  <ul style={styles.aiList}>
                    {aiInsights.insights.risk_departments.map(
                      (item, index) => (
                        <li key={index}>
                          <strong>
                            {item.department}
                          </strong>{" "}
                          — {item.risk_level}: {item.reason}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Trend Analysis
                </h3>

                <p style={styles.aiText}>
                  {aiInsights.insights.trend_analysis ||
                    "No trend analysis available."}
                </p>
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Recommendations
                </h3>

                {(aiInsights.insights.recommendations || [])
                  .length === 0 ? (
                  <p style={styles.aiText}>
                    No recommendations available.
                  </p>
                ) : (
                  <ul style={styles.aiList}>
                    {aiInsights.insights.recommendations.map(
                      (item, index) => (
                        <li key={index}>{item}</li>
                      )
                    )}
                  </ul>
                )}
              </div>

              <div style={styles.aiPanel}>
                <h3 style={styles.aiPanelTitle}>
                  Actionable Insights
                </h3>

                {(aiInsights.insights.actionable_insights || [])
                  .length === 0 ? (
                  <p style={styles.aiText}>
                    No actionable insights available.
                  </p>
                ) : (
                  <ul style={styles.aiList}>
                    {aiInsights.insights.actionable_insights.map(
                      (item, index) => (
                        <li key={index}>{item}</li>
                      )
                    )}
                  </ul>
                )}
              </div>

            </div>
          ) : (
            <EmptyState
              text="No AI insights loaded yet."
            />
          )}

        </section>

        {/* EXECUTIVE NOTES */}

        <section style={styles.card}>

          <SectionHeader
            title="Executive Interpretation"
            subtitle="Quick interpretation of the current metrics"
          />

          <div style={styles.insightList}>

            <Insight
              title="Overall attendance"
              text={
                summary
                  ? `The current overall attendance rate is ${formatNumber(
                      summary.attendance_rate
                    )}%.`
                  : "No attendance rate is currently available."
              }
            />

            <Insight
              title="Workforce presence"
              text={
                summary
                  ? `${(summary.present ?? summary.present) ?? 0} attendance records are marked present and ${
                      (summary.absent ?? summary.absent) ?? 0
                    } are marked absent.`
                  : "No workforce presence data is available."
              }
            />

            <Insight
              title="Department performance"
              text={
                bestDepartment
                  ? `${bestDepartment.department_name} currently has the highest department attendance rate at ${formatNumber(
                      bestDepartment.attendance_rate
                    )}%.`
                  : "Department performance cannot currently be determined."
              }
            />

            <Insight
              title="Overtime"
              text={
                summary
                  ? `Recorded overtime currently totals ${formatNumber(
                      summary.total_overtime_hours
                    )} hours.`
                  : "No overtime information is currently available."
              }
            />

          </div>

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


function SnapshotCard({
  title,
  value,
  detail,
}) {
  return (
    <div style={styles.snapshotCard}>

      <p style={styles.snapshotTitle}>
        {title}
      </p>

      <h3 style={styles.snapshotValue}>
        {value}
      </h3>

      <p style={styles.snapshotDetail}>
        {detail}
      </p>

    </div>
  );
}


function PerformanceBadge({
  rate,
}) {
  let label = "Needs Attention";

  if (rate >= 90) {
    label = "Excellent";
  } else if (rate >= 80) {
    label = "Good";
  } else if (rate >= 70) {
    label = "Moderate";
  }

  let background = "#fee2e2";
  let color = "#991b1b";

  if (rate >= 90) {
    background = "#dcfce7";
    color = "#166534";
  } else if (rate >= 80) {
    background = "#dbeafe";
    color = "#1d4ed8";
  } else if (rate >= 70) {
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
      {label}
    </span>
  );
}


function Insight({
  title,
  text,
}) {
  return (
    <div style={styles.insight}>

      <strong>
        {title}
      </strong>

      <p>
        {text}
      </p>

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


function EmptyState({
  text,
}) {
  return (
    <div style={styles.emptyState}>
      {text}
    </div>
  );
}


function Table({
  children,
}) {
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

  snapshotGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },

  snapshotCard: {
    padding: "18px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  snapshotTitle: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 600,
  },

  snapshotValue: {
    margin: "9px 0 5px",
    fontSize: "20px",
  },

  snapshotDetail: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
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

  insightList: {
    display: "grid",
    gap: "12px",
  },

  insight: {
    padding: "15px 18px",
    background: "#f8fafc",
    borderRadius: "8px",
    borderLeft: "4px solid #2563eb",
  },

  aiGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px",
  },

  aiPanel: {
    padding: "17px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
  },

  aiPanelTitle: {
    margin: "0 0 9px",
    fontSize: "16px",
  },

  aiText: {
    margin: 0,
    lineHeight: 1.55,
    color: "#475569",
  },

  aiList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#475569",
    lineHeight: 1.6,
  },

  aiError: {
    padding: "14px 16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#991b1b",
  },

  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "8px",
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