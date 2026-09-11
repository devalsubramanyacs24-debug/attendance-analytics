import React, { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function Reports({ token }) {
    const formatTime = (value) => {
  if (value === null || value === undefined || value === "" || value === "-") {
    return "-";
  }

  const totalSeconds = Number(value);

  if (!Number.isNaN(totalSeconds)) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return new Date(1970, 0, 1, hours, minutes).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return value;
};
  const [reportType, setReportType] = useState("attendance");
  const [startDate, setStartDate] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [department, setDepartment] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      let url = "";
      let params = {};

      if (reportType === "attendance") {
        url = `${API_URL}/api/reports/attendance`;

        params = {
          start_date: startDate || undefined,
          end_date: reportDate || undefined,
          department: department || undefined,
        };
      }

      if (reportType === "daily") {
        if (!reportDate) {
          throw new Error(
            "Please select a report date."
          );
        }

        url = `${API_URL}/api/reports/daily`;

        params = {
          report_date: reportDate,
          department: department || undefined,
        };
      }

      if (reportType === "weekly") {
        if (!startDate) {
          throw new Error(
            "Please select the week start date."
          );
        }

        url = `${API_URL}/api/reports/weekly`;

        params = {
          start_date: startDate,
          department: department || undefined,
        };
      }

      if (reportType === "monthly") {
        if (!year || !month) {
          throw new Error(
            "Please select year and month."
          );
        }

        url = `${API_URL}/api/reports/monthly`;

        params = {
          year,
          month,
          department: department || undefined,
        };
      }

      const response = await axios.get(
        url,
        {
          ...headers,
          params,
        }
      );

      setReport(response.data);

    } catch (err) {
      console.error(
        "Report generation error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to generate report."
      );

    } finally {
      setLoading(false);
    }
  };
const exportReport = async (format) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/reports/export/${format}`,
      {
        ...headers,
        params: {
          start_date:
            startDate || undefined,

          end_date:
            reportDate || undefined,

          department:
            department || undefined,
        },

        responseType: "blob",
      }
    );

    const blob = new Blob(
      [response.data],
      {
        type:
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      format === "pdf"
        ? "attendance_report.pdf"
        : "attendance_report.xlsx";

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error(
      "Export error:",
      err
    );

    setError(
      err.response?.data?.detail ||
        `Unable to export ${format.toUpperCase()} report.`
    );
  }
};
  const records =
    report?.records || [];

  return (
    <section style={styles.card}>

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            Attendance Reports
          </h2>

          <p style={styles.subtitle}>
            Generate daily, weekly, monthly and
            custom attendance reports.
          </p>
        </div>
      </div>

      {/* REPORT CONTROLS */}

      <div style={styles.controls}>

        <div>
          <label style={styles.label}>
            Report Type
          </label>

          <select
            value={reportType}
            onChange={(e) =>
              setReportType(e.target.value)
            }
            style={styles.input}
          >
            <option value="attendance">
              Custom Attendance
            </option>

            <option value="daily">
              Daily
            </option>

            <option value="weekly">
              Weekly
            </option>

            <option value="monthly">
              Monthly
            </option>
          </select>
        </div>

        {reportType === "attendance" && (
          <>
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
                value={reportDate}
                onChange={(e) =>
                  setReportDate(e.target.value)
                }
                style={styles.input}
              />
            </div>
          </>
        )}

        {reportType === "daily" && (
          <div>
            <label style={styles.label}>
              Date
            </label>

            <input
              type="date"
              value={reportDate}
              onChange={(e) =>
                setReportDate(e.target.value)
              }
              style={styles.input}
            />
          </div>
        )}

        {reportType === "weekly" && (
          <div>
            <label style={styles.label}>
              Week Starting
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
        )}

        {reportType === "monthly" && (
          <>
            <div>
              <label style={styles.label}>
                Year
              </label>

              <input
                type="number"
                min="2000"
                max="2100"
                placeholder="2026"
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Month
              </label>

              <select
                value={month}
                onChange={(e) =>
                  setMonth(e.target.value)
                }
                style={styles.input}
              >
                <option value="">
                  Select Month
                </option>

                {Array.from(
                  { length: 12 },
                  (_, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
                    >
                      {new Date(
                        2000,
                        index,
                        1
                      ).toLocaleString(
                        "default",
                        {
                          month: "long",
                        }
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          </>
        )}

        <div>
          <label style={styles.label}>
            Department
          </label>

          <input
            type="text"
            placeholder="All Departments"
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value)
            }
            style={styles.input}
          />
        </div>

        <button
          style={styles.primaryButton}
          onClick={generateReport}
          disabled={loading}
        >
          {loading
            ? "Generating..."
            : "Generate Report"}
        </button>
        <button
  style={styles.excelButton}
  onClick={() => exportReport("excel")}
  disabled={!report || loading}
>
  Export Excel
</button>

<button
  style={styles.pdfButton}
  onClick={() => exportReport("pdf")}
  disabled={!report || loading}
>
  Export PDF
</button>

      </div>

      {/* ERROR */}

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* REPORT RESULT */}

      {report && (
        <div style={styles.result}>

          <div style={styles.resultHeader}>
            <div>
              <h3 style={styles.resultTitle}>
                {report.report_type}
              </h3>

              <p style={styles.resultSubtitle}>
                Total Records:{" "}
                <strong>
                  {report.total_records ?? 0}
                </strong>
              </p>
            </div>
          </div>

          {records.length === 0 ? (
            <div style={styles.empty}>
              No attendance records found
              for the selected filters.
            </div>
          ) : (
            <div style={styles.tableWrapper}>

              <table style={styles.table}>

                <thead>
                  <tr>
                    <th style={styles.th}>
                      Employee Code
                    </th>

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
                      Check In
                    </th>

                    <th style={styles.th}>
                      Check Out
                    </th>

                    <th style={styles.th}>
                      Hours
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
                  {records.map(
                    (item, index) => (
                      <tr key={index}>

                        <td style={styles.td}>
                          {item.employee_code}
                        </td>

                        <td style={styles.td}>
                          {item.employee_name}
                        </td>

                        <td style={styles.td}>
                          {item.department_name}
                        </td>

                        <td style={styles.td}>
                          {item.attendance_date}
                        </td>

                        <td style={styles.td}>
                          {item.status}
                        </td>

                        <td>{formatTime(item.login_time)}</td>
<td>{formatTime(item.logout_time)}</td>

                        <td style={styles.td}>
                          {item.working_hours ?? 0}
                        </td>

                        <td style={styles.td}>
                          {item.overtime_hours ?? 0}
                        </td>

                        <td style={styles.td}>
                          {item.late_minutes ?? 0}
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </div>
      )}

    </section>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.06)",
  },

  header: {
    marginBottom: "20px",
  },

  title: {
    margin: 0,
    fontSize: "22px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  controls: {
    display: "flex",
    alignItems: "end",
    flexWrap: "wrap",
    gap: "16px",
    padding: "18px",
    background: "#f8fafc",
    borderRadius: "10px",
    marginBottom: "20px",
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

  error: {
    padding: "12px",
    borderRadius: "8px",
    background: "#fee2e2",
    color: "#991b1b",
    marginBottom: "18px",
  },

  result: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "20px",
  },

  resultHeader: {
    marginBottom: "16px",
  },

  resultTitle: {
    margin: 0,
    fontSize: "18px",
  },

  resultSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "1000px",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "8px",
  },
  excelButton: {
  border: "none",
  borderRadius: "8px",
  padding: "10px 17px",
  background: "#15803d",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
},

pdfButton: {
  border: "none",
  borderRadius: "8px",
  padding: "10px 17px",
  background: "#b91c1c",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
},
};