import React, { useEffect, useState } from "react";
import axios from "axios";

import SuperAdminDashboard from "../superadmin";
import HRDashboard from "../hr";
import DepartmentManagerDashboard from "../departmentmanager";
import ExecutiveDashboard from "../executive";
import EmployeeDashboard from "../employee";
import DataAnalystDashboard from "../dataanalyst";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // ===============================
  // AUTHENTICATION STATE
  // ===============================

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    try {
      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("access_token");
  });

  // ===============================
  // LOGIN STATE
  // ===============================

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // ===============================
  // WEBSOCKET
  // ===============================

  useEffect(() => {
    if (!token) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/dashboard?token=${token}`
    );

    socket.onopen = () => {
      console.log(
        "✅ Dashboard WebSocket connected"
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.event === "dashboard_updated"
        ) {
          console.log(
            "📢 New attendance data detected"
          );

          window.location.reload();
        }
      } catch (error) {
        console.error(
          "WebSocket message error:",
          error
        );
      }
    };

    socket.onerror = (error) => {
      console.error(
        "❌ Dashboard WebSocket error:",
        error
      );
    };

    socket.onclose = () => {
      console.log(
        "🔴 Dashboard WebSocket disconnected"
      );
    };

    return () => {
      socket.close();
    };
  }, [token]);

  // ===============================
  // LOGIN
  // ===============================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email: loginEmail,
          password: loginPassword,
        }
      );

      const accessToken =
        response.data.access_token;

      const loggedInUser =
        response.data.user;

      if (!accessToken || !loggedInUser) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      // Save authentication information
      localStorage.setItem(
        "access_token",
        accessToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      // Update React state
      setToken(accessToken);
      setUser(loggedInUser);

    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err.response?.data || err
      );

      setLoginError(
        err.response?.data?.detail ||
        "Invalid email or password."
      );

    } finally {
      setLoginLoading(false);
    }
  };

  // ===============================
  // LOGOUT
  // ===============================

  const handleLogout = async () => {
    try {
      if (token) {
        await axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );
      }

    } catch (error) {
      console.error(
        "Logout audit request failed:",
        error
      );

    } finally {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem("user");

      setToken(null);
      setUser(null);
    }
  };

  // ===============================
  // LOGIN PAGE
  // ===============================

  if (!user || !token) {
    return (
      <div style={styles.centerScreen}>

        <form
          onSubmit={handleLogin}
          style={styles.loginCard}
        >

          <h1 style={styles.loginTitle}>
            Attendance Analytics
          </h1>

          <p style={styles.loginSubtitle}>
            Sign in to continue
          </p>

          {/* EMAIL */}

          <label style={styles.label}>
            Email
          </label>

          <input
            type="email"
            value={loginEmail}
            onChange={(e) =>
              setLoginEmail(
                e.target.value
              )
            }
            placeholder="Enter your email"
            required
            style={styles.input}
          />

          {/* PASSWORD */}

          <label style={styles.label}>
            Password
          </label>

          <input
            type="password"
            value={loginPassword}
            onChange={(e) =>
              setLoginPassword(
                e.target.value
              )
            }
            placeholder="Enter your password"
            required
            style={styles.input}
          />

          {/* ERROR */}

          {loginError && (
            <div style={styles.loginError}>
              {loginError}
            </div>
          )}

          {/* BUTTON */}

          <button
            type="submit"
            disabled={loginLoading}
            style={styles.loginButton}
          >
            {loginLoading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>
      </div>
    );
  }

  // ===============================
  // ROLE-BASED DASHBOARD ROUTING
  // ===============================

  console.log(
    "Logged-in user:",
    user
  );

  console.log(
    "User role:",
    user.role
  );

  // SUPER ADMIN

  if (user.role === "SUPER_ADMIN") {
    return (
      <SuperAdminDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // HR

  if (
    user.role === "HR" ||
    user.role === "HR_MANAGER"
  ) {
    return (
      <HRDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // DEPARTMENT MANAGER

  if (
    user.role === "DEPARTMENT_MANAGER"
  ) {
    return (
      <DepartmentManagerDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // EXECUTIVE

  if (user.role === "EXECUTIVE") {
    return (
      <ExecutiveDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // EMPLOYEE

  if (user.role === "EMPLOYEE") {
    return (
      <EmployeeDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // DATA ANALYST

  if (user.role === "DATA_ANALYST") {
    return (
      <DataAnalystDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // ===============================
  // UNKNOWN ROLE
  // ===============================

  return (
    <div style={styles.centerScreen}>

      <div style={styles.errorCard}>

        <h2>
          Access Denied
        </h2>

        <p>
          Your account has an unsupported
          role.
        </p>

        <p>
          Role:{" "}
          <strong>
            {user.role || "Unknown"}
          </strong>
        </p>

        <button
          onClick={handleLogout}
          style={styles.loginButton}
        >
          Logout
        </button>

      </div>

    </div>
  );
}

// ===============================
// STYLES
// ===============================

const styles = {

  centerScreen: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    padding: "20px",
    boxSizing: "border-box",
  },

  loginCard: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    width: "380px",
    maxWidth: "100%",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },

  loginTitle: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "28px",
  },

  loginSubtitle: {
    color: "#64748b",
    marginBottom: "28px",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "18px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "14px",
  },

  loginButton: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },

  loginError: {
    color: "#dc2626",
    background: "#fef2f2",
    borderRadius: "8px",
    padding: "10px 12px",
    marginBottom: "16px",
    fontSize: "14px",
  },

  errorCard: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
    maxWidth: "450px",
  },
};

export default App;