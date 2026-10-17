import { useEffect, useMemo, useRef, useState } from "react";

import { Link } from "react-router-dom";

import "./Booking.css";

import "./BookingRefresh.css";

import "./BookingTrackingAdditions.css";

import "./BookingTabs.css";
import "./BookingPolish.css";

import Tracking from "../Tracking/Tracking";

import AppointmentNav from "./AppointmentNav";

const API = (import.meta.env.VITE_BOOKING_API_URL || "http://127.0.0.1:5001").replace(/\/$/, "");

const services = [

  { id: "haircut", category: "HAIR ATELIER", name: "Signature Haircut", duration: 60, price: 1200, icon: "✂", description: "A tailored cut, styled to feel like you." },

  { id: "styling", category: "HAIR ATELIER", name: "Hair Styling", duration: 45, price: 900, icon: "✧", description: "Beautiful finishing for your kind of occasion." },

  { id: "color", category: "COLOUR STUDIO", name: "Colour & Gloss", duration: 120, price: 2800, icon: "◈", description: "Personalised colour with luminous finishing." },

  { id: "facial", category: "SKIN RITUALS", name: "Luxury Facial", duration: 75, price: 2200, icon: "✳", description: "A restorative ritual for your complexion." },

  { id: "makeup", category: "BEAUTY ATELIER", name: "Signature Makeup", duration: 90, price: 2500, icon: "✦", description: "An expressive look, considered down to the detail." },

  { id: "bridal", category: "BRIDAL ATELIER", name: "Bridal Consultation", duration: 60, price: 1500, icon: "◇", description: "Start building your special-day vision." },

];

const artists = [

  { id: "any", name: "Best Available", role: "MATCH ME WITH A SPECIALIST", initial: "✦" },

  { id: "artist-a", name: "Artist 01", role: "DEMO SPECIALIST", initial: "01" },

  { id: "artist-b", name: "Artist 02", role: "DEMO SPECIALIST", initial: "02" },

];

const steps = ["SERVICES", "SPECIALIST", "DATE & TIME", "YOUR DETAILS"];

const money = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

function humanDate(value) {

  if (!value) return "Not chosen";

  const [y,m,d] = value.split("-").map(Number);

  return new Date(y,m-1,d).toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short", year:"numeric" });

}

function keepWorkspaceVisible() {

  requestAnimationFrame(() => {

    const el = document.getElementById("auren-booking-workspace");

    if (!el) return;

    const rect = el.getBoundingClientRect();

    // Don't jump to the top of the entire page on each step.

    if (rect.top < 0 || rect.top > innerHeight * .6) {

      window.scrollTo({ top: Math.max(0, rect.top + scrollY - 24), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });

    }

  });

}

export default function Booking({ initialMode = "book" }) {

  const [mode, setMode] = useState(initialMode);

  const [step, setStep] = useState(0);

  const [selected, setSelected] = useState([]);

  const [artist, setArtist] = useState("any");

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [slots, setSlots] = useState([]);

  const [loading, setLoading] = useState(false);

  const [availabilityError, setAvailabilityError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [booking, setBooking] = useState(null);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState("");

  const [details, setDetails] = useState({ name:"", phone:"", email:"", notes:"" });

  const requestId = useRef(0);
  async function copyBookingId() {
    if (!booking?.reference) return;
    try {
      await navigator.clipboard.writeText(booking.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  }


  const chosen = useMemo(() => services.filter(s => selected.includes(s.id)), [selected]);

  const duration = chosen.reduce((sum,s) => sum+s.duration,0);

  const total = chosen.reduce((sum,s) => sum+s.price,0);

  const today = localDate(new Date());

  useEffect(() => {

    if (!date || !selected.length) { setSlots([]); setTime(""); setAvailabilityError(""); return; }

    const controller = new AbortController();

    const id = ++requestId.current;

    setLoading(true); setAvailabilityError(""); setSlots([]); setTime("");

    const params = new URLSearchParams({ date, artist_id:artist, service_ids:selected.join(",") });

    fetch(`${API}/api/booking/availability?${params}`, { signal:controller.signal })

      .then(async response => {

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Availability failed.");

        if (id===requestId.current) setSlots(data.slots || []);

      })

      .catch(e => { if (e.name!=="AbortError" && id===requestId.current) setAvailabilityError("Live availability unavailable. Start the booking backend to see reservable slots."); })

      .finally(() => { if (id===requestId.current) setLoading(false); });

    return () => { controller.abort(); requestId.current++; };

  }, [date, artist, selected]);

  const toggle = id => { setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]); setTime(""); setError(""); };

  const next = () => { if (step===0&&!selected.length) return; if (step===2&&(!date||!time||!slots.some(s=>s.time===time))) return; setError(""); setStep(s=>Math.min(3,s+1)); keepWorkspaceVisible(); };

  const back = () => { setError(""); setStep(s=>Math.max(0,s-1)); keepWorkspaceVisible(); };

  async function submit(e) {

    e.preventDefault(); setSubmitting(true); setError("");

    try {

      const response = await fetch(`${API}/api/booking/reservations`, {

        method:"POST", headers:{"Content-Type":"application/json"},

        body:JSON.stringify({ service_ids:selected, artist_id:artist, date, time, ...details })

      });

      const data = await response.json();

      if (!response.ok) {

        if (response.status===409) { setTime(""); setStep(2); keepWorkspaceVisible(); }

        throw new Error(data.error || "Booking was not saved.");

      }

      setBooking(data); keepWorkspaceVisible();

    } catch (e) { setError(e.message || "Could not reach booking server."); }

    finally { setSubmitting(false); }

  }

  return <div className="auren-booking-page">

    <AppointmentNav mode={mode} onModeChange={setMode} />

    {mode === "track" ? (

      <Tracking embedded onBookNow={() => setMode("book")} />

    ) : (

    <main className="auren-booking-main">

      <section className="auren-booking-intro"><span className="auren-booking-eyebrow">✦ THE AUREN EXPERIENCE / BOOK ONLINE</span><h1>A moment made <em>for you.</em></h1><p>Curate every detail of your time at the atelier. Multiple rituals, one seamless appointment.</p><div className="auren-booking-preview-notice">DEMO SALON · Example artists and prices · Live booking requires local booking backend</div></section>

      {!booking && <div className="auren-booking-progress" aria-label={`Step ${step+1} of 4`}>{steps.map((label,i)=><div className={`auren-booking-progress-item ${i===step?"is-active":""} ${i<step?"is-complete":""}`} key={label}><span className="auren-booking-progress-number">{i<step?"✓":String(i+1).padStart(2,"0")}</span><span className="auren-booking-progress-label">{label}</span><span className="auren-booking-progress-line"/></div>)}</div>}

      <div className="auren-booking-layout" id="auren-booking-workspace">

        <div className="auren-booking-content">

          {booking ? <section className="auren-booking-panel auren-booking-success" role="status"><span className="auren-booking-section-index">APPOINTMENT RESERVED</span><div className="auren-booking-success-mark">✓</div><h2>Your time is <em>reserved.</em></h2><div className="auren-booking-reference-box"><span>YOUR BOOKING ID</span><div><strong>{booking.reference}</strong><button type="button" onClick={copyBookingId} aria-label="Copy booking reference">{copied ? "✓ COPIED" : "COPY ID ↗"}</button></div></div><p className="auren-booking-save-note">Please save your <strong>Booking ID</strong> and the <strong>mobile number</strong> you used. You can track the status with either one. Booking ID unlocks detailed tracking; mobile-only lookup shows limited status for privacy.</p><p>{humanDate(booking.date)} · {booking.time} · {booking.artist_name}</p><p>Saved on the local demo booking server. Automated customer confirmation messages are not configured yet.</p><div className="auren-booking-confirm-actions"><button type="button" className="auren-booking-next" onClick={() => setMode("track")}>TRACK APPOINTMENT ↗</button><Link className="auren-booking-next" to="/home">RETURN TO ATELIER ↗</Link></div></section> : <>

            {step===0 && <section className="auren-booking-panel" aria-labelledby="service-title"><div className="auren-booking-section-head"><span>01 / CURATE YOUR VISIT</span><h2 id="service-title">Choose your <em>rituals.</em></h2><p>Select one or more services. Their durations combine into one continuous appointment.</p></div><div className="auren-booking-service-grid">{services.map(s=>{const checked=selected.includes(s.id);return <button type="button" key={s.id} aria-pressed={checked} onClick={()=>toggle(s.id)} className={`auren-booking-service-card ${checked?"is-selected":""}`}><span className="auren-booking-card-top"><span className="auren-booking-service-icon">{s.icon}</span><span className="auren-booking-select-dot">{checked?"✓":"+"}</span></span><span className="auren-booking-card-category">{s.category}</span><strong>{s.name}</strong><span className="auren-booking-card-description">{s.description}</span><span className="auren-booking-card-bottom"><span>{s.duration} MIN</span><span>{money(s.price)}</span></span></button>})}</div><p className="auren-booking-disclaimer">Sample prices and durations. Multiple services are performed consecutively by one capable provider.</p></section>}

            {step===1 && <section className="auren-booking-panel" aria-labelledby="artist-title"><div className="auren-booking-section-head"><span>02 / YOUR SPECIALIST</span><h2 id="artist-title">Expert <em>hands.</em></h2><p>Choose a preferred specialist, or let us match you with someone available for every selected service.</p></div><div className="auren-booking-artist-grid">{artists.map(a=><button type="button" key={a.id} aria-pressed={artist===a.id} onClick={()=>{setArtist(a.id);setTime("");}} className={`auren-booking-artist-card ${artist===a.id?"is-selected":""}`}><span className="auren-booking-artist-avatar">{a.initial}</span><span className="auren-booking-artist-info"><small>{a.role}</small><strong>{a.name}</strong><span>{a.id==="any"?"A qualified provider is assigned at booking.":"Demo profile · availability checked before booking."}</span></span><span className="auren-booking-select-dot">{artist===a.id?"✓":"+"}</span></button>)}</div></section>}

            {step===2 && <section className="auren-booking-panel" aria-labelledby="time-title"><div className="auren-booking-section-head"><span>03 / SET THE DATE</span><h2 id="time-title">Find your <em>moment.</em></h2><p>Only slots with an eligible provider free for your entire {duration}-minute appointment are shown.</p></div><label className="auren-booking-field"><span>PREFERRED DATE</span><input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)}/></label><div className="auren-booking-time-header"><h3>Available starts</h3><span>LIVE SERVER CHECK</span></div>{loading?<p className="auren-booking-feedback">Checking availability…</p>:availabilityError?<p role="alert" className="auren-booking-feedback is-error">{availabilityError}</p>:!date?<p className="auren-booking-feedback">Select a date to check real availability.</p>:slots.length===0?<p className="auren-booking-feedback">No free slots. Try another date or Best Available.</p>:<div className="auren-booking-time-grid">{slots.map(s=><button type="button" key={s.time} className={`auren-booking-time-slot ${time===s.time?"is-selected":""}`} aria-pressed={time===s.time} onClick={()=>setTime(s.time)}>{s.label}</button>)}</div>}<p className="auren-booking-disclaimer">Availability is checked again when you reserve. If another customer books first, you'll be asked to pick a new slot.</p></section>}

            {step===3 && <section className="auren-booking-panel" aria-labelledby="details-title"><div className="auren-booking-section-head"><span>04 / FINAL DETAILS</span><h2 id="details-title">Almost <em>there.</em></h2><p>One appointment covers all of your chosen services.</p></div><form id="auren-booking-form" className="auren-booking-form" onSubmit={submit}><div className="auren-booking-form-grid"><label className="auren-booking-field"><span>FULL NAME *</span><input name="name" type="text" autoComplete="name" required maxLength={80} value={details.name} onChange={e=>setDetails(d=>({...d,name:e.target.value}))} placeholder="Your full name"/></label><label className="auren-booking-field"><span>PHONE NUMBER *</span><input name="phone" type="tel" autoComplete="tel" required maxLength={20} pattern="[+0-9 ()-]{7,20}" value={details.phone} onChange={e=>setDetails(d=>({...d,phone:e.target.value}))} placeholder="+91 XXXXX XXXXX"/></label></div><label className="auren-booking-field"><span>EMAIL ADDRESS *</span><input name="email" type="email" autoComplete="email" required maxLength={120} value={details.email} onChange={e=>setDetails(d=>({...d,email:e.target.value}))} placeholder="you@example.com"/></label><label className="auren-booking-field"><span>SPECIAL REQUESTS</span><textarea name="notes" rows={4} maxLength={500} value={details.notes} onChange={e=>setDetails(d=>({...d,notes:e.target.value}))} placeholder="Anything we should know?"/></label><p className="auren-booking-disclaimer">Demo backend stores customer details locally. Don't use real customer information until production security and privacy are configured.</p></form></section>}

            {error && <p className="auren-booking-feedback is-error" role="alert">{error}</p>}

            

          </>}

        </div>

        <aside className="auren-booking-summary"><div className="auren-booking-summary-top"><span>YOUR EXPERIENCE</span><span>{String(step+1).padStart(2,"0")} / 04</span></div><h3>The details, <em>beautifully arranged.</em></h3><div className="auren-booking-summary-item"><span>SERVICES</span><strong>{chosen.length?chosen.map(s=>s.name).join(" + "):"Not chosen"}</strong></div><div className="auren-booking-summary-item"><span>ARTIST</span><strong>{artists.find(a=>a.id===artist)?.name}</strong></div><div className="auren-booking-summary-item"><span>DATE</span><strong>{humanDate(date)}</strong></div><div className="auren-booking-summary-item"><span>TIME</span><strong>{time||"Not chosen"}</strong></div><div className="auren-booking-summary-total"><span><small>ESTIMATED TOTAL</small><strong>{chosen.length?money(total):"—"}</strong></span><span>{duration?`${duration} MIN`:"DURATION"}</span></div><p>ONE APPOINTMENT · MULTIPLE SERVICES<br/>DEMO SALON / AUREN ATELIER</p>{!booking && <div className="auren-booking-controls">{step>0?<button type="button" className="auren-booking-back" onClick={back}>← PREVIOUS STEP</button>:<Link className="auren-booking-back" to="/home">← RETURN HOME</Link>}{step<3?<button type="button" className="auren-booking-next" disabled={(step===0&&!selected.length)||(step===2&&(!date||!time||loading))} onClick={next}>CONTINUE <span>↗</span></button>:<button type="submit" form="auren-booking-form" className="auren-booking-next" disabled={submitting}>{submitting?"RESERVING…":"RESERVE APPOINTMENT"} <span>↗</span></button>}</div>}</aside>

      </div>

    </main>

    )}

    <footer className="auren-booking-footer"><span>© {new Date().getFullYear()} AUREN</span><span>THE ART OF BEING YOU</span></footer>

  </div>;

}
