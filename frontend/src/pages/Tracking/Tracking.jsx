import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Tracking.css";
import "./TrackingPolish.css";
import "./TrackingRefined.css";

const API = (import.meta.env.VITE_BOOKING_API_URL || "http://127.0.0.1:5001").replace(/\/$/, "");
const serviceLabels = { haircut: "Signature Haircut", styling: "Hair Styling", color: "Colour & Gloss", facial: "Luxury Facial", makeup: "Signature Makeup", bridal: "Bridal Consultation" };
const statusLabels = { pending: "Pending review", confirmed: "Confirmed", arrived: "Arrived", absent: "Absent / No-show", billed: "Billed", completed: "Completed", cancelled: "Cancelled", canceled: "Cancelled" };

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function getStatusMeta(rawStatus) {
  const normalized = String(rawStatus || "").toLowerCase().trim();
  const descriptions = {
    confirmed: "Your appointment is booked and confirmed.",
    arrived: "You have been marked as arrived at the atelier.",
    absent: "This appointment is currently marked as a no-show.",
    billed: "Your appointment has been billed.",
    completed: "Your appointment has been completed.",
    cancelled: "This appointment was cancelled.",
    canceled: "This appointment was cancelled.",
    pending: "Your appointment is awaiting confirmation.",
  };
  return { normalized, label: statusLabels[normalized] || rawStatus || "Unavailable", description: descriptions[normalized] || "This is the latest status on record." };
}
function FieldIcon({ kind }) {
  return kind === "ticket" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z"/><path d="M12 6v2m0 3v2m0 3v2"/></svg>
  ) : kind === "phone" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18h4"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
  );
}
export default function Tracking({ embedded = false, onBookNow }) {
  const [lookupType, setLookupType] = useState("reference");
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const switchRef = useRef(null);
  const [slide, setSlide] = useState({ left: 5, width: 0 });
  useEffect(() => {
    const update = () => {
      const item = switchRef.current?.querySelector(`[data-mode="${lookupType}"]`);
      if (item) setSlide({ left: item.offsetLeft, width: item.offsetWidth });
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (switchRef.current) observer?.observe(switchRef.current);
    window.addEventListener("resize", update);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); };
  }, [lookupType]);
  useEffect(() => {
    if (!result || result.status !== "confirmed" || !result.created_at) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [result]);

  function chooseLookup(next) { setLookupType(next); setResult(null); setError(""); setCopied(false); }
  async function lookup(event) {
    event.preventDefault();
    if (loading) return;
    const useReference = lookupType === "reference";
    const cleanReference = reference.trim().toUpperCase();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (useReference && !/^AUR-[0-9A-F]{12}$/.test(cleanReference)) { setError("Enter a valid Booking ID, e.g. AUR-XXXXXXXXXXXX."); return; }
    if (!useReference && (!/^\d{10}$/.test(cleanPhone.replace(/\D/g, "").slice(-10)) || !cleanEmail)) { setError("Enter your registered mobile number and email."); return; }
    setLoading(true); setResult(null); setError(""); setCopied(false);
    try {
      const response = await fetch(`${API}/api/booking/track`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useReference ? { reference: cleanReference } : { phone: cleanPhone, email: cleanEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't find your appointment.");
      setNowMs(Date.now());
      setResult(data);
    } catch (err) {
      setError(err instanceof TypeError ? "Unable to connect to the booking server. Please try again." : err.message || "Unable to track this appointment.");
    } finally { setLoading(false); }
  }
  async function copyReference() {
    if (!result?.reference) return;
    try { await navigator.clipboard.writeText(result.reference); setCopied(true); }
    catch { setCopied(false); }
  }
  const status = result ? getStatusMeta(result.status) : null;
  const services = result?.service_ids || [];
  const createdTime = result?.created_at ? Date.parse(result.created_at) : NaN;
  const reviewSeconds = result?.status === "confirmed" && Number.isFinite(createdTime)
    ? Math.max(0, Math.ceil((createdTime + 90000 - nowMs) / 1000)) : 0;
  const inReviewWindow = reviewSeconds > 0;
  const safePhone = result?.customer_phone || "—";
  return (
    <div className={`auren-track-page auren-track-refined ${embedded ? "auren-track-embedded" : ""}`}>
      {!embedded && <header className="auren-track-header"><Link className="auren-track-logo" to="/home">AUREN<span>.</span></Link><Link className="auren-track-back" to="/home">← BACK TO ATELIER</Link></header>}
      <main className="auren-track-main">
        <div className="auren-track-intro"><span className="auren-track-eyebrow"><span className="auren-track-spark"/> AUREN / APPOINTMENT CONCIERGE</span><h1>Your visit, <em>in view.</em></h1><p>Find your appointment, confirm its current status, and review every detail of your visit.</p></div>
        <div className="auren-track-grid">
          <section className="auren-track-card" aria-labelledby="auren-track-lookup-heading">
            <div className="auren-track-card-heading"><span>01 / FIND YOUR APPOINTMENT</span><h2 id="auren-track-lookup-heading">Find your <em>moment.</em></h2><p>Use your Booking ID, or search with the mobile number and email entered when booking.</p></div>
            <form onSubmit={lookup} className="auren-track-form">
              <div className="auren-track-lookup-switch auren-track-switch-v3" ref={switchRef} role="group" aria-label="Lookup method">
                <span className="auren-track-switch-glass" aria-hidden="true" style={{left:slide.left,width:slide.width}} />
                <button type="button" data-mode="reference" className={lookupType === "reference" ? "is-active" : ""} aria-pressed={lookupType === "reference"} onClick={() => chooseLookup("reference")}>Booking ID</button>
                <button type="button" data-mode="phone" className={lookupType === "phone" ? "is-active" : ""} aria-pressed={lookupType === "phone"} onClick={() => chooseLookup("phone")}>Mobile &amp; Email</button>
              </div>
              {lookupType === "reference" ? (
                <label><span>YOUR BOOKING ID</span><div className="auren-track-input-wrap"><FieldIcon kind="ticket"/><input type="text" maxLength={16} placeholder="AUR-XXXXXXXXXXXX" autoComplete="off" spellCheck={false} required value={reference} onChange={e => {setReference(e.target.value.toUpperCase());setError("");}}/></div></label>
              ) : <>
                <label><span>REGISTERED MOBILE NUMBER</span><div className="auren-track-input-wrap"><FieldIcon kind="phone"/><input type="tel" inputMode="tel" maxLength={20} placeholder="Mobile used while booking" autoComplete="tel" required value={phone} onChange={e => {setPhone(e.target.value);setError("");}}/></div></label>
                <label><span>BOOKING EMAIL ADDRESS</span><div className="auren-track-input-wrap"><FieldIcon kind="email"/><input type="email" maxLength={120} placeholder="Email used while booking" autoComplete="email" required value={email} onChange={e => {setEmail(e.target.value);setError("");}}/></div></label>
              </>}
              <button className="auren-track-action" type="submit" disabled={loading}>{loading ? "FINDING YOUR APPOINTMENT…" : "VIEW APPOINTMENT"}{loading ? <span className="auren-track-spinner" aria-hidden="true"/> : <span aria-hidden="true">↗</span>}</button>
              {error && <p role="alert" className="auren-track-error">{error}</p>}
              <div className="auren-track-security-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Use details from your booking confirmation. A mobile number alone can't unlock private appointment details.</span></div>
            </form>
          </section>
          <aside className="auren-track-info" aria-label="Appointment details" aria-live="polite">
            {result ? <div className="auren-track-result">
              <div className="auren-track-result-top"><span className="auren-track-mini">YOUR APPOINTMENT</span><span className="auren-track-verified">✓ RECORD FOUND</span></div>
              <section className={`auren-track-status-feature is-${inReviewWindow ? "pending" : status.normalized || "unknown"}`} aria-label="Current booking status">
                <span className="auren-track-status-feature-label">CURRENT BOOKING STATUS</span>
                <div className="auren-track-status-feature-main"><span className="auren-track-status-feature-dot" aria-hidden="true"/><strong>{inReviewWindow ? "Checking your request" : status.label}</strong></div>
                <p>{inReviewWindow ? `Your appointment is saved in our system. The confirmation display becomes available shortly (${Math.ceil(reviewSeconds / 60)} min remaining).` : status.description}</p>
                {inReviewWindow && <div className="auren-track-review-progress"><span style={{width:`${Math.max(1,100-reviewSeconds/90*100)}%`}}/></div>}
              </section>
              <p className="auren-track-result-overline">BOOKING REFERENCE</p><div className="auren-track-ref-row"><h3>{result.reference || "—"}</h3>{result.reference && <button type="button" onClick={copyReference} className="auren-track-copy">{copied ? "✓ COPIED" : "COPY ID"}</button>}</div>
              <div className="auren-track-visit-overview"><span>YOUR VISIT DETAILS</span><p>These details match the appointment record.</p></div>
              <div className="auren-track-customer-card"><div className="auren-track-customer-avatar">{(result.customer_name || "G").slice(0,1).toUpperCase()}</div><div><span>BOOKED FOR</span><strong>{result.customer_name || "Guest"}</strong><small>{safePhone} · {result.customer_email || "—"}</small></div></div>
              <dl className="auren-track-detail-list"><div><dt>DATE</dt><dd>{formatDate(result.date)}</dd></div><div><dt>TIME</dt><dd>{result.time || "—"} IST</dd></div><div><dt>SPECIALIST</dt><dd>{result.artist_name || "—"}</dd></div><div><dt>NAME</dt><dd>{result.customer_name || "—"}</dd></div><div><dt>CONTACT</dt><dd>{safePhone}</dd></div><div><dt>EMAIL</dt><dd>{result.customer_email || "—"}</dd></div><div><dt>SERVICES</dt><dd>{services.length ? services.map(id => serviceLabels[id] || id).join(" · ") : "—"}</dd></div><div><dt>DURATION</dt><dd>{Number.isFinite(Number(result.duration)) ? `${result.duration} min` : "—"}</dd></div>{result.notes && <div><dt>SPECIAL REQUESTS</dt><dd>{result.notes}</dd></div>}<div><dt>ESTIMATED TOTAL</dt><dd>{result.total_price != null && Number.isFinite(Number(result.total_price)) ? `₹${Number(result.total_price).toLocaleString("en-IN")}` : "—"}</dd></div></dl>
              <p className="auren-track-help">Need to change your appointment? Contact the atelier directly. This page is read-only.</p>
            </div> : <div className="auren-track-empty auren-track-empty-v3">
              <div className="auren-track-empty-heading"><div className="auren-track-orbit" aria-hidden="true"><span>✧</span><i/></div><div><span className="auren-track-mini">THE AUREN CONCIERGE</span><h3>Every detail,<br/><em>beautifully kept.</em></h3></div></div>
              <p>Find your reservation to view the customer name, contact, services, time, specialist and live status.</p>
              <div className="auren-track-empty-divider"/>
              <div className="auren-track-empty-features-grid">
                <div><span>01</span><strong>Booking status</strong><small>Clear, highlighted updates</small></div>
                <div><span>02</span><strong>Customer details</strong><small>Name &amp; registered contact</small></div>
                <div><span>03</span><strong>Visit schedule</strong><small>Date, time &amp; specialist</small></div>
                <div><span>04</span><strong>Service summary</strong><small>Selected rituals &amp; total</small></div>
              </div>
              <p className="auren-track-help">Your Booking ID is on your confirmation. You can also find a booking with your registered mobile and email.</p>
            </div>}
          </aside>
        </div>
        <div className="auren-track-bottom"><span>AUREN — HAIR &amp; BEAUTY ATELIER</span>{embedded ? <button type="button" onClick={onBookNow}>MAKE A NEW BOOKING <span aria-hidden="true">↗</span></button> : <Link to="/booking">MAKE A NEW BOOKING <span aria-hidden="true">↗</span></Link>}</div>
      </main>
    </div>
  );
}
