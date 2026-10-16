
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiUserPlus,
} from "react-icons/fi";

const API_URL =
  import.meta.env.VITE_BOOKING_API_URL ||
  "http://127.0.0.1:5001";

const SERVICES = [
  { id: "haircut", name: "Haircut", price: 1200 },
  { id: "styling", name: "Hair Styling", price: 900 },
  { id: "color", name: "Hair Color", price: 2800 },
  { id: "facial", name: "Facial", price: 2200 },
  { id: "makeup", name: "Makeup", price: 2500 },
  { id: "bridal", name: "Bridal", price: 1500 },
];

const inputStyle = {
  width: "100%",
  padding: "13px 15px",
  background: "#1d2227",
  color: "#f2f4f5",
  border: "1px solid #48515a",
  borderRadius: 7,
  font: "inherit",
  colorScheme: "dark",
};

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function AdminWalkins() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const token = sessionStorage.getItem("auren_admin_token");

  const loadWalkins = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/walkins`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        sessionStorage.removeItem("auren_admin_token");
        navigate("/admin/login", { replace: true });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load walk-ins.");
      }

      setWalkins(data.walkins || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    loadWalkins();
  }, [token, navigate, loadWalkins]);

  function toggleService(id) {
    setSelectedServices((previous) =>
      previous.includes(id)
        ? previous.filter((service) => service !== id)
        : [...previous, id]
    );
  }

  const estimatedTotal = SERVICES
    .filter((service) => selectedServices.includes(service.id))
    .reduce((sum, service) => sum + service.price, 0);

  async function registerWalkin(event) {
    event.preventDefault();
    setError("");
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/walkins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            service_ids: selectedServices,
          }),
        }
      );

      if (response.status === 401) {
        sessionStorage.removeItem("auren_admin_token");
        navigate("/admin/login", { replace: true });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccess(data);
      setName("");
      setPhone("");
      setSelectedServices([]);

      await loadWalkins();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#101214",
        color: "#f2f3f4",
        padding: "45px clamp(16px, 5vw, 60px)",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/admin")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "transparent",
          border: 0,
          color: "#c4cbd2",
          cursor: "pointer",
          marginBottom: 35,
        }}
      >
        <FiArrowLeft />
        Back to Dashboard
      </button>

      <div style={{ marginBottom: 36 }}>
        <p
          style={{
            color: "#a8b1ba",
            fontSize: 11,
            letterSpacing: "0.2em",
          }}
        >
          AUREN / MANAGEMENT
        </p>

        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
          Walk-in Registration
        </h1>

        <p style={{ color: "#9da7b1" }}>
          Register customers visiting the atelier directly.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
          gap: 28,
          alignItems: "start",
        }}
      >
        <section
          style={{
            background: "#1b2024",
            border: "1px solid #353d45",
            borderRadius: 12,
            padding: 28,
          }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 21,
              marginBottom: 30,
            }}
          >
            <FiUserPlus />
            New Walk-in Customer
          </h2>

          <form onSubmit={registerWalkin}>
            <label htmlFor="walkin-name">CUSTOMER NAME</label>
            <input
              id="walkin-name"
              style={{ ...inputStyle, margin: "10px 0 22px" }}
              placeholder="Enter customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />

            <label htmlFor="walkin-phone">PHONE NUMBER</label>
            <input
              id="walkin-phone"
              type="tel"
              style={{ ...inputStyle, margin: "10px 0 22px" }}
              placeholder="Enter customer phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <p style={{ marginBottom: 15 }}>SELECT SERVICES</p>

            <div style={{ display: "grid", gap: 10 }}>
              {SERVICES.map((service) => (
                <label
                  key={service.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 15,
                    padding: "12px 14px",
                    border: "1px solid #394149",
                    borderRadius: 7,
                    background: selectedServices.includes(service.id)
                      ? "#303941"
                      : "#20262b",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                    />
                    {service.name}
                  </span>

                  <span style={{ color: "#c3cbd3" }}>
                    {formatMoney(service.price)}
                  </span>
                </label>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #3a434b",
                marginTop: 24,
                paddingTop: 20,
              }}
            >
              <strong>Estimated Total</strong>
              <strong>{formatMoney(estimatedTotal)}</strong>
            </div>

            {error && (
              <p style={{ color: "#efa3a3" }} role="alert">
                {error}
              </p>
            )}

            {success && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  color: "#b5dec5",
                  background: "#24352b",
                  border: "1px solid #40664a",
                  borderRadius: 7,
                  padding: 15,
                  marginTop: 20,
                }}
              >
                <FiCheckCircle size={20} />
                <div>
                  <strong>Customer Registered!</strong>
                  <p style={{ marginBottom: 0 }}>
                    Customer ID: {success.customer_id}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || selectedServices.length === 0}
              style={{
                width: "100%",
                marginTop: 24,
                padding: 16,
                background: "#ccd3da",
                color: "#14181c",
                border: 0,
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "REGISTERING..." : "REGISTER CUSTOMER"}
            </button>
          </form>
        </section>

        <section
          style={{
            background: "#1b2024",
            border: "1px solid #353d45",
            borderRadius: 12,
            padding: 28,
          }}
        >
          <h2 style={{ fontSize: 21 }}>
            Registered Walk-ins
          </h2>

          <p style={{ color: "#a0a9b3", marginBottom: 25 }}>
            {walkins.length} customer records
          </p>

          {loading ? (
            <p>Loading customers...</p>
          ) : walkins.length === 0 ? (
            <p style={{ color: "#a0a9b3" }}>
              No walk-in customers registered yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {walkins.map((customer) => (
                <div
                  key={customer.customer_id}
                  style={{
                    background: "#242a30",
                    border: "1px solid #3b434c",
                    borderRadius: 8,
                    padding: 17,
                  }}
                >
                  <strong>{customer.name}</strong>

                  <p
                    style={{
                      color: "#b0bac4",
                      fontSize: 12,
                      lineHeight: 1.9,
                      marginBottom: 8,
                    }}
                  >
                    {customer.customer_id}
                    <br />
                    {customer.phone}
                    <br />
                    {customer.service_ids.join(", ")}
                  </p>

                  <strong>
                    {formatMoney(customer.total_price)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
