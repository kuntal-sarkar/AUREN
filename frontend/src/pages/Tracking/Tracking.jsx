import { useState } from "react";
import { Link } from "react-router-dom";
import "./Tracking.css";

const API = (import.meta.env.VITE_BOOKING_API_URL || "http://127.0.0.1:5001").replace(/\/$/, "");

const serviceLabels = {
  haircut: "Signature Haircut",
  styling: "Hair Styling",
  color: "Colour & Gloss",
  facial: "Luxury Facial",
  makeup: "Signature Makeup",
  bridal: "Bridal Consultation",
};

const statusLabels = {
  pending: "Pending review",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getStatusMeta(rawStatus) {
  const normalized = String(rawStatus || "").toLowerCase().trim();
  return {
    normalized,
    label: statusLabels[normalized] || (normalized ? normalized.replace(/_/g, " ") : "Status unavailable"),
    description:
      normalized === "confirmed"
        ? "Your appointment is currently confirmed in the booking system."
        : normalized === "pending"
          ? "Your appointment request is awaiting confirmation."
          : normalized === "completed"
            ? "This appointment is marked as completed."
            : normalized === "cancelled" || normalized === "canceled"
              ? "This appointment has been cancelled."
              : "This is the current status recorded by the booking system.",
  };
}

function FieldIcon({ kind }) {
  return kind === "ticket" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z" />
      <path d="M12 6v2m0 3v2m0 3v2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="3" />
      <path d="M9 6h6M9 17h6" />
    </svg>
  );
}

export default function Tracking({ embedded = false, onBookNow }) {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API}/api/booking/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim().toUpperCase(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "We couldn't find a matching appointment.");
      }
      setResult(data);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to reach the booking server. Please try again later."
          : err.message || "Unable to track this appointment."
      );
    } finally {
      setLoading(false);
    }
  }

  const status = result ? getStatusMeta(result.status) : null;
  const services = result?.service_ids || [];

  return (
    <div className={`auren-track-page ${embedded ? "auren-track-embedded" : ""}`}>
      {!embedded && (
        <header className="auren-track-header">
          <Link className="auren-track-logo" to="/home">AUREN<span>.</span></Link>
          <Link className="auren-track-back" to="/home">← BACK TO ATELIER</Link>
        </header>
      )}

      <main className="auren-track-main">
        <div className="auren-track-intro">
          <span className="auren-track-eyebrow"><span className="auren-track-spark" /> AUREN / APPOINTMENT CONCIERGE</span>
          <h1>Your visit, <em>in view.</em></h1>
          <p>Everything about your appointment, all in one place. Find your booking securely using your reference and phone number.</p>
        </div>

        <div className="auren-track-grid">
          <section className="auren-track-card" aria-labelledby="auren-track-lookup-heading">
            <div className="auren-track-card-heading">
              <span>01 / PRIVATE BOOKING LOOKUP</span>
              <h2 id="auren-track-lookup-heading">Find your <em>moment.</em></h2>
              <p>Enter the details from your booking confirmation to see its latest recorded status.</p>
            </div>

            <form onSubmit={lookup} className="auren-track-form">
              <label>
                <span>BOOKING REFERENCE</span>
                <div className="auren-track-input-wrap">
                  <FieldIcon kind="ticket" />
                  <input
                    required
                    maxLength={32}
                    placeholder="AUR-XXXXXXXXXXXX"
                    autoComplete="off"
                    spellCheck={false}
                    value={reference}
                    onChange={(event) => {
                      setReference(event.target.value.toUpperCase());
                      setResult(null);
                      setError("");
                    }}
                  />
                </div>
              </label>

              <label>
                <span>REGISTERED PHONE NUMBER</span>
                <div className="auren-track-input-wrap">
                  <FieldIcon kind="phone" />
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    maxLength={20}
                    placeholder="Phone used during booking"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setResult(null);
                      setError("");
                    }}
                  />
                </div>
              </label>

              <button className="auren-track-action" type="submit" disabled={loading}>
                {loading ? "LOOKING UP YOUR BOOKING…" : "TRACK MY APPOINTMENT"}
                {loading ? <span className="auren-track-spinner" aria-hidden="true" /> : <span aria-hidden="true">↗</span>}
              </button>

              {error && <p role="alert" className="auren-track-error">{error}</p>}

              <div className="auren-track-security-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                <span>Only bookings matching both your reference and phone number can be viewed. We won't display your personal contact details.</span>
              </div>
            </form>
          </section>

          <aside className="auren-track-info" aria-label="Appointment details" aria-live="polite">
            {result ? (
              <div className="auren-track-result">
                <div className="auren-track-result-top">
                  <span className="auren-track-mini">YOUR APPOINTMENT</span>
                  <span className={`auren-track-status is-${status.normalized || "unknown"}`}>
                    <i aria-hidden="true" />{status.label}
                  </span>
                </div>
                <p className="auren-track-result-overline">BOOKING REFERENCE</p>
                <h3>{result.reference}</h3>
                <p className="auren-track-result-description">{status.description}</p>

                <div className="auren-track-checkpoint">
                  <div className="auren-track-checkpoint-icon" aria-hidden="true">✓</div>
                  <div>
                    <strong>Booking record located</strong>
                    <span>Showing the latest status returned by the booking system</span>
                  </div>
                </div>

                <dl className="auren-track-detail-list">
                  <div><dt>DATE</dt><dd>{formatDate(result.date)}</dd></div>
                  <div><dt>TIME</dt><dd>{result.time || "—"} IST</dd></div>
                  <div><dt>ARTIST</dt><dd>{result.artist_name || "—"}</dd></div>
                  <div><dt>SERVICES</dt><dd>{services.length ? services.map((id) => serviceLabels[id] || id).join(" · ") : "—"}</dd></div>
                  <div><dt>DURATION</dt><dd>{Number.isFinite(Number(result.duration)) ? `${result.duration} min` : "—"}</dd></div>
                  <div><dt>ESTIMATED TOTAL</dt><dd>{Number.isFinite(Number(result.total_price)) && result.total_price != null ? `₹${Number(result.total_price).toLocaleString("en-IN")}` : "—"}</dd></div>
                </dl>
                <p className="auren-track-help">Need to reschedule or make a change? Please contact the atelier directly. This page does not modify bookings.</p>
              </div>
            ) : (
              <div className="auren-track-empty">
                <div className="auren-track-orbit" aria-hidden="true">
                  <span>✧</span>
                  <i />
                </div>
                <span className="auren-track-mini">YOUR EXPERIENCE, AT A GLANCE</span>
                <h3>Every detail,<br /><em>beautifully kept.</em></h3>
                <p>Once we find your booking, your visit details will appear here in a private summary.</p>
                <div className="auren-track-empty-divider" />
                <div className="auren-track-empty-feature"><span>01</span> Latest appointment status</div>
                <div className="auren-track-empty-feature"><span>02</span> Date, time & specialist</div>
                <div className="auren-track-empty-feature"><span>03</span> Services & estimated total</div>
                <p className="auren-track-help">Your unique Booking ID is shown on your booking confirmation. Keep it somewhere safe.</p>
              </div>
            )}
          </aside>
        </div>

        <div className="auren-track-bottom">
          <span>AUREN — HAIR & BEAUTY ATELIER</span>
          {embedded ? (
            <button type="button" onClick={onBookNow}>MAKE A NEW BOOKING <span aria-hidden="true">↗</span></button>
          ) : (
            <Link to="/booking">MAKE A NEW BOOKING <span aria-hidden="true">↗</span></Link>
          )}
        </div>
      </main>
    </div>
  );
}
