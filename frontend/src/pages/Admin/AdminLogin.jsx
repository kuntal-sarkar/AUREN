
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
} from "react-icons/fi";

import "./Admin.css";

const API_URL =
  import.meta.env.VITE_BOOKING_API_URL ||
  "http://127.0.0.1:5001";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        throw new Error(
          data.error || "Invalid username or password."
        );
      }

      sessionStorage.setItem("auren_admin_token", data.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to connect to the admin server."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auren-admin-login">
      <div className="auren-admin-atmosphere" />

      <div className="auren-admin-login-container">
        <section className="auren-admin-brand-panel">
          <div className="auren-admin-brand-top">
            <span className="auren-admin-brand-name">AUREN</span>
            <span className="auren-admin-brand-divider" />
            <span className="auren-admin-brand-caption">
              HAIR & BEAUTY ATELIER
            </span>
          </div>

          <div className="auren-admin-brand-content">
            <span className="auren-admin-eyebrow">
              PRIVATE MANAGEMENT PORTAL
            </span>

            <h1>
              Refined service.
              <br />
              <em>Effortless control.</em>
            </h1>

            <p>
              Manage appointments, welcome your clients,
              and oversee your atelier — all from one space.
            </p>

            <div className="auren-admin-brand-rule" />

            <span className="auren-admin-brand-footer">
              DESIGNED FOR THE ART OF HOSPITALITY
            </span>
          </div>

          <div className="auren-admin-brand-bottom">
            <span>AUREN / MANAGEMENT</span>
            <span>EST. 2026</span>
          </div>
        </section>

        <section className="auren-admin-form-panel">
          <div className="auren-admin-mobile-logo">
            AUREN
          </div>

          <div className="auren-admin-form-content">
            <div className="auren-admin-lock-icon">
              <FiLock size={21} />
            </div>

            <span className="auren-admin-form-eyebrow">
              AUTHORIZED ACCESS
            </span>

            <h2>Welcome back.</h2>

            <p className="auren-admin-form-subtitle">
              Sign in to access your atelier dashboard.
            </p>

            <form onSubmit={handleLogin}>
              <div className="auren-admin-field">
                <label htmlFor="auren-admin-username">
                  USERNAME
                </label>
                <input
                  id="auren-admin-username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  required
                />
              </div>

              <div className="auren-admin-field">
                <label htmlFor="auren-admin-password">
                  PASSWORD
                </label>

                <div className="auren-admin-password-field">
                  <input
                    id="auren-admin-password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="auren-admin-password-toggle"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="auren-admin-login-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auren-admin-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "AUTHENTICATING..."
                    : "ACCESS DASHBOARD"}
                </span>

                {!loading && <FiArrowRight size={18} />}
              </button>
            </form>

            <div className="auren-admin-security-note">
              <FiShield size={15} />
              <span>
                Restricted to authorized atelier personnel.
              </span>
            </div>
          </div>

          <div className="auren-admin-form-footer">
            <span>© 2026 AUREN ATELIER</span>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </section>
      </div>
    </main>
  );
}
