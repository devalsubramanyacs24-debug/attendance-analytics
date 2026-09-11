import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function EmployeeDashboard({
  user,
  token,
  onLogout,
}) {
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveForm, setLeaveForm] = useState({
  leave_date: "",
  leave_type: "Casual Leave",
  reason: "",
});

const [leaveSubmitting, setLeaveSubmitting] = useState(false);
const [leaveMessage, setLeaveMessage] = useState("");
const [leaveError, setLeaveError] = useState("");

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

    return params;
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const params = getParams();

     const results = await Promise.allSettled([
  axios.get(`${API_URL}/api/employee/profile`, {
    ...headers,
  }),

  axios.get(`${API_URL}/api/employee/attendance`, {
    ...headers,
  }),

  axios.get(`${API_URL}/leaves`, {
    ...headers,
  }),
]);

      const [
        profileResult,
        attendanceResult,
        leaveResult,
      ] = results;

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.data);
      }

      if (attendanceResult.status === "fulfilled") {
        setAttendance(
          attendanceResult.value.data || []
        );
      }

      if (leaveResult.status === "fulfilled") {
        const data = leaveResult.value.data;

        setLeaves(
          Array.isArray(data)
            ? data
            : data?.leaves || []
        );
      }

      if (
        results.every(
          (result) =>
            result.status === "rejected"
        )
      ) {
        throw new Error(
          "Unable to load employee dashboard."
        );
      }
    } catch (err) {
      console.error(
        "Employee dashboard error:",
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
            "Unable to load employee dashboard."
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

  /*
   * These calculations are intentionally based on the
   * attendance records returned for the logged-in employee.
   */

  const filteredAttendance = attendance.filter((record) => {
    const recordDate = String(record.attendance_date || "").slice(0, 10);

    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;

    return true;
  });

  const totalRecords = filteredAttendance.length;

  const presentCount = filteredAttendance.filter(
    (record) =>
      String(record.status).toLowerCase() ===
      "present"
  ).length;

  const absentCount = filteredAttendance.filter(
    (record) =>
      String(record.status).toLowerCase() ===
      "absent"
  ).length;

  const lateCount = filteredAttendance.filter(
    (record) =>
      Number(record.late_minutes || 0) > 0
  ).length;

  const totalWorkingHours = filteredAttendance.reduce(
    (total, record) =>
      total +
      Number(record.working_hours || 0),
    0
  );

  const totalOvertimeHours = filteredAttendance.reduce(
    (total, record) =>
      total +
      Number(record.overtime_hours || 0),
    0
  );

  const workingDayRecords = filteredAttendance.filter(
    (record) =>
      !["weekend", "holiday", "on leave"].includes(
        String(record.status).toLowerCase()
      )
  ).length;

  const averageWorkingHours =
    workingDayRecords > 0
      ? totalWorkingHours / workingDayRecords
      : 0;

  const attendanceRate =
    workingDayRecords > 0
      ? (presentCount / workingDayRecords) * 100
      : 0;

  const leaveCount = leaves.length;

  const approvedLeaves = leaves.filter(
    (leave) =>
      String(
        leave.status || ""
      ).toLowerCase() === "approved"
  ).length;

  const pendingLeaves = leaves.filter(
    (leave) =>
      String(
        leave.status || ""
      ).toLowerCase() === "pending"
  ).length;

  const sortedAttendance = useMemo(() => {
    return [...attendance].sort(
      (a, b) =>
        new Date(
          b.attendance_date
        ) -
        new Date(
          a.attendance_date
        )
    );
  }, [attendance]);

  const formatNumber = (value) =>
    Number(value || 0).toFixed(2);
  const formatTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  // Backend may return MySQL TIME as seconds from midnight
  if (typeof value === "number") {
    const totalSeconds = Math.round(value);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${String(displayHour).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")} ${period}`;
  }

  // Also handle numeric strings
  if (/^\d+$/.test(String(value))) {
    return formatTime(Number(value));
  }

  // Already formatted time/string
  return String(value);
};

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
  const handleLeaveSubmit = async (e) => {
  e.preventDefault();

  if (
    !leaveForm.leave_date ||
    !leaveForm.leave_type ||
    !leaveForm.reason.trim()
  ) {
    setLeaveError(
      "Please fill in the leave date, leave type and reason."
    );
    setLeaveMessage("");
    return;
  }

  try {
    setLeaveSubmitting(true);
    setLeaveError("");
    setLeaveMessage("");

    const params = new URLSearchParams({
  leave_date: leaveForm.leave_date,
  leave_type: leaveForm.leave_type,
  reason: leaveForm.reason.trim(),
});

await axios.post(
  `${API_URL}/leaves?${params.toString()}`,
  null,
  headers
);
    setLeaveForm({
      leave_date: "",
      leave_type: "Casual Leave",
      reason: "",
    });

    setLeaveMessage(
      "Leave application submitted successfully."
    );

    await loadDashboard();
  } catch (err) {
    console.error("Leave application error:", err);

    setLeaveError(
      err.response?.data?.detail ||
        err.message ||
        "Unable to submit leave application."
    );

    setLeaveMessage("");
  } finally {
    setLeaveSubmitting(false);
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

          <h2>
            Loading Employee Dashboard
          </h2>

          <p>
            Fetching your attendance information...
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
            Employee Dashboard
          </h1>

          <p style={styles.subtitle}>
            Your attendance, working hours and leave information
          </p>
        </div>

        <div style={styles.headerRight}>

          <div style={styles.userInfo}>
            <strong>
              {profile?.employee_name ||
                user?.name ||
                "Employee"}
            </strong>

            <span>
              {profile?.email ||
                user?.email ||
                ""}
            </span>

            <span style={styles.roleBadge}>
              EMPLOYEE
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

        {/* PROFILE */}

        <section style={styles.profileCard}>

          <div>
            <span style={styles.smallLabel}>
              MY PROFILE
            </span>

            <h2 style={styles.profileName}>
              {profile?.employee_name ||
                user?.name ||
                "Employee"}
            </h2>

            <p style={styles.profileText}>
              Employee Code:{" "}
              <strong>
                {profile?.employee_code ||
                  user?.employee_code ||
                  "-"}
              </strong>
            </p>
          </div>

          <div style={styles.profileDetails}>

            <ProfileItem
              label="Email"
              value={
                profile?.email ||
                user?.email ||
                "-"
              }
            />

            <ProfileItem
              label="Department"
              value={
                profile?.department_name ||
                user?.department_name ||
                "-"
              }
            />

            <ProfileItem
              label="Designation"
              value={
                profile?.designation ||
                "-"
              }
            />

            <ProfileItem
              label="Status"
              value={
                profile?.status ||
                "Active"
              }
            />

          </div>

        </section>

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

        {/* KPI CARDS */}

        <section style={styles.kpiGrid}>

          <MetricCard
            title="Attendance Rate"
            value={`${formatNumber(
              attendanceRate
            )}%`}
          />

          <MetricCard
            title="Present Days"
            value={presentCount}
          />

          <MetricCard
            title="Absent Days"
            value={absentCount}
          />

          <MetricCard
            title="Late Days"
            value={lateCount}
          />

          <MetricCard
            title="Average Working Hours"
            value={formatNumber(
              averageWorkingHours
            )}
          />

          <MetricCard
            title="Total Working Hours"
            value={formatNumber(
              totalWorkingHours
            )}
          />

          <MetricCard
            title="Overtime Hours"
            value={formatNumber(
              totalOvertimeHours
            )}
          />

          <MetricCard
            title="Leave Records"
            value={leaveCount}
          />

        </section>

        {/* ATTENDANCE SUMMARY */}

        <section style={styles.card}>

          <SectionHeader
            title="Attendance Summary"
            subtitle="Your attendance performance for the selected period"
          />

          <div style={styles.summaryGrid}>

            <SummaryBox
              title="Present"
              value={presentCount}
              description="Days marked present"
            />

            <SummaryBox
              title="Absent"
              value={absentCount}
              description="Days marked absent"
            />

            <SummaryBox
              title="Late"
              value={lateCount}
              description="Late attendance records"
            />

            <SummaryBox
              title="Attendance Rate"
              value={`${formatNumber(
                attendanceRate
              )}%`}
              description="Present / total records"
            />

          </div>

        </section>

        {/* ATTENDANCE HISTORY */}

        <section style={styles.card}>

          <SectionHeader
            title="My Attendance"
            subtitle="Detailed attendance history"
          />

          {sortedAttendance.length === 0 ? (
            <EmptyState
              text="No attendance records found for the selected period."
            />
          ) : (
            <Table>

              <thead>
                <tr>

                  <th style={styles.th}>
                    Date
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Check In
                  </th>

                  <th style={styles.th}>
                    Check Out
                  </th>

                  <th style={styles.th}>
                    Working Hours
                  </th>

                  <th style={styles.th}>
                    Overtime
                  </th>

                  <th style={styles.th}>
                    Late Minutes
                  </th>

                </tr>
              </thead>

              <tbody>

                {sortedAttendance.map(
                  (record, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        {formatDate(
                          record.attendance_date
                        )}
                      </td>

                      <td style={styles.td}>
                        <StatusBadge
                          status={
                            record.status
                          }
                        />
                      </td>

                      <td style={styles.td}>
                        {formatTime(
  record.login_time ??
    record.check_in ??
    record.check_in_time
)}
                      </td>

                      <td style={styles.td}>
                        {formatTime(
  record.logout_time ??
    record.check_out ??
    record.check_out_time
)}
                      </td>

                      <td style={styles.td}>
                        {formatNumber(
                          record.working_hours
                        )}
                      </td>

                      <td style={styles.td}>
                        {formatNumber(
                          record.overtime_hours
                        )}
                      </td>

                      <td style={styles.td}>
                        {record.late_minutes ??
                          0}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </Table>
          )}

        </section>
        {/* APPLY FOR LEAVE */}

<section style={styles.card}>

  <SectionHeader
    title="Apply for Leave"
    subtitle="Submit a leave request for approval"
  />

  <form
    onSubmit={handleLeaveSubmit}
    style={styles.leaveForm}
  >

    <div>
      <label style={styles.label}>
        Leave Date
      </label>

      <input
        type="date"
        value={leaveForm.leave_date}
        onChange={(e) =>
          setLeaveForm({
            ...leaveForm,
            leave_date: e.target.value,
          })
        }
        style={styles.input}
        required
      />
    </div>

    <div>
      <label style={styles.label}>
        Leave Type
      </label>

      <select
        value={leaveForm.leave_type}
        onChange={(e) =>
          setLeaveForm({
            ...leaveForm,
            leave_type: e.target.value,
          })
        }
        style={styles.input}
        required
      >
        <option value="Casual Leave">Casual Leave</option>
        <option value="Sick Leave">Sick Leave</option>
        <option value="Earned Leave">Earned Leave</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div style={{ gridColumn: "1 / -1" }}>
      <label style={styles.label}>
        Reason
      </label>

      <textarea
        value={leaveForm.reason}
        onChange={(e) =>
          setLeaveForm({
            ...leaveForm,
            reason: e.target.value,
          })
        }
        style={styles.textarea}
        rows={3}
        placeholder="Enter the reason for your leave"
        required
      />
    </div>

    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        flexWrap: "wrap",
      }}
    >
      <button
        type="submit"
        style={styles.primaryButton}
        disabled={leaveSubmitting}
      >
        {leaveSubmitting
          ? "Submitting..."
          : "Apply Leave"}
      </button>

      {leaveMessage && (
        <span style={{ color: "#166534", fontWeight: 600 }}>
          {leaveMessage}
        </span>
      )}

      {leaveError && (
        <span style={{ color: "#b91c1c", fontWeight: 600 }}>
          {leaveError}
        </span>
      )}
    </div>

  </form>

</section>

        {/* LEAVE */}

        <section style={styles.card}>

          <SectionHeader
            title="My Leave"
            subtitle="Your available leave information"
          />

          <div style={styles.leaveSummary}>

            <SummaryBox
              title="Total Records"
              value={leaveCount}
              description="Leave records"
            />

            <SummaryBox
              title="Approved"
              value={approvedLeaves}
              description="Approved requests"
            />

            <SummaryBox
              title="Pending"
              value={pendingLeaves}
              description="Pending requests"
            />

          </div>

          {leaves.length === 0 ? (
            <EmptyState
              text="No leave records available."
            />
          ) : (
            <Table>

              <thead>
                <tr>

                  <th style={styles.th}>
                    Leave Type
                  </th>

                  <th style={styles.th}>
                    Start Date
                  </th>

                  <th style={styles.th}>
                    End Date
                  </th>

                  <th style={styles.th}>
                    Days
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

                {leaves.map(
                  (leave, index) => (
                    <tr key={index}>

                      <td style={styles.td}>
                        {leave.leave_type ??
                          leave.type ??
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {formatDate(
                          leave.start_date ??
                          leave.leave_date
                        )}
                      </td>

                      <td style={styles.td}>
                        {formatDate(
                          leave.end_date ??
                          leave.leave_date
                        )}
                      </td>

                      <td style={styles.td}>
                        {leave.total_days ??
                          leave.days ??
                          1}
                      </td>

                      <td style={styles.td}>
                        <StatusBadge
                          status={
                            leave.status
                          }
                        />
                      </td>

                      <td style={styles.td}>
                        {leave.reason ??
                          "-"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </Table>
          )}

        </section>

        {/* QUICK INFORMATION */}

        <section style={styles.card}>

          <SectionHeader
            title="My Attendance Insights"
            subtitle="Quick interpretation of your current attendance"
          />

          <div style={styles.insightList}>

            <Insight
              title="Attendance performance"
              text={
                `Your attendance rate for the selected period is ${formatNumber(
                  attendanceRate
                )}%.`
              }
            />

            <Insight
              title="Working hours"
              text={
                `You have recorded ${formatNumber(
                  totalWorkingHours
                )} total working hours, with an average of ${formatNumber(
                  averageWorkingHours
                )} hours per attendance record.`
              }
            />

            <Insight
              title="Overtime"
              text={
                `Your recorded overtime currently totals ${formatNumber(
                  totalOvertimeHours
                )} hours.`
              }
            />

            <Insight
              title="Leave"
              text={
                `You currently have ${approvedLeaves} approved leave record(s) and ${pendingLeaves} pending request(s).`
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


function SummaryBox({
  title,
  value,
  description,
}) {
  return (
    <div style={styles.summaryBox}>

      <span style={styles.summaryTitle}>
        {title}
      </span>

      <strong style={styles.summaryValue}>
        {value}
      </strong>

      <span style={styles.summaryDescription}>
        {description}
      </span>

    </div>
  );
}


function ProfileItem({
  label,
  value,
}) {
  return (
    <div style={styles.profileItem}>

      <span style={styles.profileLabel}>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function StatusBadge({
  status,
}) {
  const value =
    String(status || "-");

  const lower =
    value.toLowerCase();

  let background = "#e5e7eb";
  let color = "#374151";

  if (
    lower === "present" ||
    lower === "approved" ||
    lower === "active"
  ) {
    background = "#dcfce7";
    color = "#166534";
  }

  if (
    lower === "absent" ||
    lower === "rejected" ||
    lower === "inactive"
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

  profileCard: {
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

  profileName: {
    margin: "7px 0",
    fontSize: "26px",
  },

  profileText: {
    margin: 0,
    color: "#64748b",
  },

  profileDetails: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(180px, 1fr))",
    gap: "14px 30px",
  },

  profileItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  profileLabel: {
    color: "#64748b",
    fontSize: "12px",
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

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },

  summaryBox: {
    padding: "18px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  summaryTitle: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 600,
  },

  summaryValue: {
    fontSize: "24px",
  },

  summaryDescription: {
    color: "#94a3b8",
    fontSize: "12px",
  },

  leaveSummary: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "900px",
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
  leaveForm: {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(220px, 1fr))",
  gap: "18px",
  alignItems: "end",
},

textarea: {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  borderRadius: "7px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  resize: "vertical",
  fontFamily: "inherit",
},
};