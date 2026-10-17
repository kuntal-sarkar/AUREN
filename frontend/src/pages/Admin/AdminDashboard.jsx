import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiLogOut, FiCalendar, FiClock, FiFileText, FiTrendingUp, FiClipboard, FiUserPlus, FiCheck, FiPrinter, FiSearch, FiPhone, FiMessageSquare, FiRefreshCw, FiX, FiSettings, FiUser, FiShield, FiPlus, FiExternalLink, FiMenu, FiChevronLeft, FiInbox, FiVolume2, FiVolumeX } from "react-icons/fi";
import "./AdminDashboard.css";

const API = import.meta.env.VITE_BOOKING_API_URL || "http://127.0.0.1:5001";
const SERVICES = [
  ["haircut", "Haircut", 1200], ["styling", "Hair Styling", 900], ["color", "Hair Color", 2800],
  ["facial", "Facial", 2200], ["makeup", "Makeup", 2500], ["bridal", "Bridal", 1500],
];
const SERVICE_LOOKUP = Object.fromEntries(SERVICES.map(([id, name, price]) => [id, { name, price }]));
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const todayIST = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
const dateTime = (v) => v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—";
const hhmm = (label) => {
  const match = String(label || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "00:00";
  const h = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${match[2]}`;
};
const norm = (value) => String(value || "").toLowerCase().trim();
const matches = (item, q) => !q || [item.reference, item.customer_id, item.name, item.phone, item.email].some(x => norm(x).includes(norm(q)));
const terminal = (status) => ["billed", "completed", "cancelled"].includes(status);
const displayStatus = (s) => ({ confirmed: "Booked", arrived: "Arrived / Attending", absent: "Absent / No-show", billed: "Billed — Pending Print", completed: "Completed / Bill Printed", cancelled: "Cancelled", registered: "Registered" }[s] || s || "—");
const phoneDigits = (p) => String(p || "").replace(/[^\d+]/g, "");
// Greeting follows the studio clock (India), independent of the visitor's time zone.
const studioGreeting = () => {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23"
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 16) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
};

function ServiceLines({ ids = [], total }) {
  return <div className="desk-lines">{ids.map((id) => <div key={id}><span>{SERVICE_LOOKUP[id]?.name || id}</span><span>{SERVICE_LOOKUP[id] ? money(SERVICE_LOOKUP[id].price) : "—"}</span></div>)}<div className="desk-line-total"><strong>Total</strong><strong>{money(total)}</strong></div></div>;
}
function Pill({ status }) { return <span className={`desk-pill desk-pill-${status || "confirmed"}`}>{displayStatus(status)}</span>; }

function GlassTabs({ items, value, onChange, className = "" }) {
  const wrap = useRef(null);
  const [indicator, setIndicator] = useState(null);
  useLayoutEffect(() => {
    const update = () => {
      const selected = Array.from(wrap.current?.querySelectorAll("button[data-glass-tab]") || [])
        .find(node => node.dataset.glassTab === String(value));
      if (selected) setIndicator({ left: selected.offsetLeft, top: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight });
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (wrap.current) ro?.observe(wrap.current);
    Array.from(wrap.current?.querySelectorAll("button") || []).forEach(btn => ro?.observe(btn));
    window.addEventListener("resize", update);
    return () => { ro?.disconnect(); window.removeEventListener("resize", update); };
  }, [value, items.length]);
  return <div ref={wrap} className={`crm-glass-tabs ${className}`} role="group">
    {indicator && <span aria-hidden="true" className="crm-glass-indicator" style={indicator} />}
    {items.map(({ id, label, count, Icon }) => <button type="button" key={id} data-glass-tab={id}
      className={value === id ? "selected" : ""} aria-pressed={value === id} onClick={() => onChange(id)}>
      {Icon && <Icon />}<span>{label}</span>{count !== undefined && <span className="crm-tab-count">{count}</span>}
    </button>)}
  </div>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("auren_admin_token");
  const [tab, setTab] = useState("today");
  const [adminName, setAdminName] = useState("Admin");
  const [greeting, setGreeting] = useState(studioGreeting);
  useEffect(() => {
    const update = () => setGreeting(studioGreeting());
    const id = window.setInterval(update, 60000);
    return () => window.clearInterval(id);
  }, []);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [todayTab, setTodayTab] = useState("appointments");
  const [bookings, setBookings] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [querySearch, setQuerySearch] = useState("");
  const [queryTab, setQueryTab] = useState("new");
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  // Red badge is for unseen NEW enquiries, not all unresolved enquiries.
  const [seenQueryIds, setSeenQueryIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("auren_seen_queries_v1") || "[]"); }
    catch { return []; }
  });
  const seenQueryIdsRef = useRef(seenQueryIds);
  const queryTabRef = useRef("today");
  const knownQueryIds = useRef(new Set());
  const queriesInitialized = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("auren_admin_sound") !== "off");
  const soundEnabledRef = useRef(soundEnabled);
  const soundContext = useRef(null);
  const [audioReady, setAudioReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [walkinSearch, setWalkinSearch] = useState("");
  const [walkinPage, setWalkinPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [toast, setToast] = useState(null);
  const known = useRef(new Set());
  const initialized = useRef(false);

  // Browser audio can only be unlocked by a real click/tap.
  const unlockSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      if (!soundContext.current) soundContext.current = new Context();
      soundContext.current.resume().then(() => setAudioReady(true)).catch(() => { });
    } catch { /* Audio unsupported: visual alerts continue to work. */ }
  }, []);

  const playChime = useCallback(() => {
    if (!soundEnabledRef.current || !soundContext.current || soundContext.current.state !== "running") return;
    const ctx = soundContext.current;
    const start = ctx.currentTime + 0.02;
    // Original, soft two-note bell/chime (not an Apple sound file).
    [0, 0.13].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const volume = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(i ? 1318.5 : 987.8, start + delay);
      volume.gain.setValueAtTime(0.0001, start + delay);
      volume.gain.exponentialRampToValueAtTime(0.20, start + delay + 0.015);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.55);
      osc.connect(volume);
      volume.connect(ctx.destination);
      osc.start(start + delay);
      osc.stop(start + delay + 0.57);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockSound, { passive: true });
    window.addEventListener("keydown", unlockSound);
    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
      if (soundContext.current) { soundContext.current.close().catch(() => { }); soundContext.current = null; }
    };
  }, [unlockSound]);

  function toggleSound() {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    localStorage.setItem("auren_admin_sound", next ? "on" : "off");
    if (next) unlockSound();
  }

  function markQueriesSeen(items) {
    const ids = items.filter(q => q.status === "new").map(q => q.id);
    if (!ids.length) return;
    const next = [...new Set([...seenQueryIdsRef.current, ...ids])].slice(-500);
    seenQueryIdsRef.current = next;
    setSeenQueryIds(next);
    localStorage.setItem("auren_seen_queries_v1", JSON.stringify(next));
  }
  const [walkName, setWalkName] = useState("");
  const [walkPhone, setWalkPhone] = useState("");
  const [walkServices, setWalkServices] = useState([]);
  const [registered, setRegistered] = useState(null);
  const [billingId, setBillingId] = useState("");
  const [billingMethod, setBillingMethod] = useState("");
  const [billingMatches, setBillingMatches] = useState([]);
  const [billingShowSuggestions, setBillingShowSuggestions] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printSequence, setPrintSequence] = useState(0);

  const request = useCallback(async (path, opts = {}) => {
    const resp = await fetch(`${API}${path}`, {
      ...opts, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(opts.body ? { "Content-Type": "application/json" } : {}), ...opts.headers },
    });
    if (resp.status === 401) { sessionStorage.removeItem("auren_admin_token"); navigate("/admin/login", { replace: true }); throw new Error("Session expired. Log in again."); }
    const data = await resp.json();
    if (!resp.ok) { const err = new Error(data.error || "Request failed"); err.payload = data; throw err; }
    return data;
  }, [navigate, token]);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [br, wr, ir, sr, lr, qr] = await Promise.all([
        request("/api/admin/bookings"), request("/api/admin/walkins"),
        request("/api/admin/invoices"), request("/api/admin/stats"), request("/api/admin/today-log"),
        request("/api/admin/enquiries"),
      ]);
      const fresh = br.bookings || [];
      const incoming = qr.enquiries || [];
      const newBookings = initialized.current ? fresh.filter(b => !known.current.has(b.reference)) : [];
      const newQueries = queriesInitialized.current ? incoming.filter(q => !knownQueryIds.current.has(q.id) && q.status === "new") : [];
      if (newBookings.length || newQueries.length) {
        const alerts = [
          ...newQueries.map(q => ({ id: q.id, kind: "query", name: q.name, time: q.subject, read: false })),
          ...newBookings.map(b => ({ id: b.reference, kind: "booking", name: b.name, time: b.time, read: false })),
        ];
        setNotices(old => [...alerts, ...old].slice(0, 30));
        setToast(`${newQueries.length ? `${newQueries.length} new ${newQueries.length > 1 ? "enquiries" : "enquiry"}` : ""}${newQueries.length && newBookings.length ? " · " : ""}${newBookings.length ? `${newBookings.length} new appointment${newBookings.length > 1 ? "s" : ""}` : ""} received`);
        playChime();
      }
      fresh.forEach(b => known.current.add(b.reference)); initialized.current = true;
      incoming.forEach(q => knownQueryIds.current.add(q.id)); queriesInitialized.current = true;
      if (queryTabRef.current === "queries") markQueriesSeen(incoming);
      setBookings(fresh); setWalkins(wr.walkins || []); setInvoices(ir.invoices || []); setStats(sr); setLog(lr); setEnquiries(incoming);
      setError("");
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [token, request, playChime]);

  useEffect(() => { if (!token) { navigate("/admin/login", { replace: true }); return; } refresh(); const id = setInterval(() => refresh({ silent: true }), 10000); return () => clearInterval(id); }, [token, navigate, refresh]);
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    request("/api/admin/me").then(info => {
      if (mounted && typeof info.username === "string" && info.username.trim()) setAdminName(info.username.trim());
    }).catch(() => { });
    return () => { mounted = false; };
  }, [token, request]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 5000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    if (!billingShowSuggestions || !billingId.trim()) { setBillingMatches([]); return; }
    const controller = new AbortController();
    const id = setTimeout(() => request(`/api/admin/customers/search?q=${encodeURIComponent(billingId.trim())}`, { signal: controller.signal }).then(r => setBillingMatches(r.customers || [])).catch(e => { if (e.name !== "AbortError") setBillingMatches([]); }), 250);
    return () => { clearTimeout(id); controller.abort(); };
  }, [billingId, billingShowSuggestions, request]);

  function selectTab(next) {
    queryTabRef.current = next;
    if (next === "queries") { setQueryTab("new"); markQueriesSeen(enquiries); }
    setTab(next); setSearch(""); setBellOpen(false); setMobileNavOpen(false);
  }
  async function setEnquiryStatus(id, status) {
    if (busy) return;
    setBusy(`query-${id}`); setError("");
    try {
      await request(`/api/admin/enquiries/${encodeURIComponent(id)}/status`, {
        method: "POST", body: JSON.stringify({ status }),
      });
      setEnquiries(old => old.map(q => q.id === id ? { ...q, status } : q));
      setToast(status === "resolved" ? "Enquiry resolved" : "Enquiry marked as read");
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }
  function logout() { sessionStorage.removeItem("auren_admin_token"); navigate("/admin/login", { replace: true }); }
  function goBilling(id) { setBillingId(id); setBillingMethod(""); setBillingShowSuggestions(false); setSelectedInvoice(invoices.find(x => x.source_id === id) || null); setTab("billing"); setError(""); }
  async function updateAttendance(ref, status) {
    if (busy) return; setBusy(ref); setError("");
    try { await request(`/api/admin/bookings/${ref}/attendance`, { method: "POST", body: JSON.stringify({ status }) }); await refresh({ silent: true }); setToast(`Appointment marked ${displayStatus(status)}`); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  }
  async function registerWalkin(e) {
    e.preventDefault(); setBusy("walkin"); setRegistered(null); setError("");
    try { const data = await request("/api/admin/walkins", { method: "POST", body: JSON.stringify({ name: walkName.trim(), phone: walkPhone.trim(), service_ids: walkServices }) }); setRegistered(data); setWalkinPage(1); setWalkName(""); setWalkPhone(""); setWalkServices([]); await refresh({ silent: true }); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  }
  async function generateInvoice(e) {
    e.preventDefault(); if (!billingId.trim() || !billingMethod || busy) return; setBusy("invoice"); setError("");
    try { const data = await request("/api/admin/invoices", { method: "POST", body: JSON.stringify({ customer_id: billingId.trim().toUpperCase(), payment_method: billingMethod }) }); setSelectedInvoice(data.invoice); setPrintSequence(x => x + 1); setBillingShowSuggestions(false); setBillingId(""); setBillingMethod(""); setBillingMatches([]); await refresh({ silent: true }); setRegistered(null);setToast("Invoice generated"); }
    catch (e) { if (e.payload?.invoice) { setSelectedInvoice(e.payload.invoice); } setError(e.message); } finally { setBusy(""); }
  }
  // The receipt is rendered before opening the browser's native print dialog.
  // Opening/cancelling print does NOT mark an invoice completed.
  useEffect(() => {
    if (!printSequence || !selectedInvoice) return;
    const id = window.setTimeout(() => window.print(), 120);
    return () => window.clearTimeout(id);
  }, [printSequence]);

  function openInvoice(inv, printNow = false) {
    setSelectedInvoice(inv);
    setBillingId("");
    setBillingMethod("");
    if (printNow) setPrintSequence(x => x + 1);
  }

  async function completeInvoice() {
    if (!selectedInvoice || busy) return; setBusy("complete"); setError("");
    try { const data = await request(`/api/admin/invoices/${selectedInvoice.invoice_id}/complete`, { method: "POST" }); setSelectedInvoice(data.invoice); setBillingId(""); setBillingMethod(""); setBillingMatches([]); await refresh({ silent: true }); setToast("Status locked: Completed / Bill Printed"); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  }
  const day = todayIST();
  const timeNow = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
  const todayBookings = bookings.filter(b => b.date === day).sort((a, b) => {
    const rank = x => x.status === "completed" ? 3 : ["absent", "cancelled"].includes(x.status) ? 2 : hhmm(x.time) < timeNow ? 1 : 0;
    return rank(a) - rank(b) || hhmm(a.time).localeCompare(hhmm(b.time));
  });
  const nextTodayAppointment = todayBookings.find(b => !["completed", "billed", "absent", "cancelled"].includes(b.status) && hhmm(b.time) >= timeNow);
  const completedTodayCount = todayBookings.filter(b => b.status === "completed").length;
  const todayWalkins = walkins.filter(w => w.created_at?.slice(0, 10) === day);
  const filteredTodayWalkins = todayWalkins.filter(w => matches(w, walkinSearch));
  const walkinPageCount = Math.max(1, Math.ceil(filteredTodayWalkins.length / 2));
  const currentWalkinPage = Math.min(walkinPage, walkinPageCount);
  const pagedTodayWalkins = filteredTodayWalkins.slice((currentWalkinPage - 1) * 2, currentWalkinPage * 2);
  const futureBookings = bookings.filter(b => !(["completed", "billed", "absent", "cancelled"].includes(b.status)) && (b.date > day || (b.date === day && hhmm(b.time) >= timeNow))).sort((a, b) => a.date.localeCompare(b.date) || hhmm(a.time).localeCompare(hhmm(b.time)));
  const unseenQueries = enquiries.filter(q => q.status === "new" && !seenQueryIds.includes(q.id)).length;
  const unread = notices.filter(n => !n.read).length;
  const visibleQueries = enquiries.filter(q => (queryTab === "resolved" ? q.status === "resolved" : q.status !== "resolved") && (!querySearch || [q.name, q.email, q.phone, q.subject, q.message].some(v => norm(v).includes(norm(querySearch)))));
  const selectedQuery = visibleQueries.find(q => q.id === selectedQueryId) || visibleQueries[0] || null;
  const lookupCustomer = [...bookings.map(b => ({ ...b, id: b.reference })), ...walkins.map(w => ({ ...w, id: w.customer_id }))].find(x => x.id === billingId.trim().toUpperCase());
  const revenueDays = Array.from({ length: 7 }, (_, index) => {
    const now = new Date();
    const indianDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    indianDate.setDate(indianDate.getDate() - (6 - index));
    const key = `${indianDate.getFullYear()}-${String(indianDate.getMonth() + 1).padStart(2, "0")}-${String(indianDate.getDate()).padStart(2, "0")}`;
    const amount = invoices.filter(inv => inv.created_at?.slice(0, 10) === key).reduce((sum, inv) => sum + Number(inv.total_price || 0), 0);
    return { key, label: indianDate.toLocaleDateString("en-IN", { weekday: "short" }), amount };
  });
  const revenueMax = Math.max(1, ...revenueDays.map(x => x.amount));
  const walkinCustomers = walkins.length;
  const appointmentCustomers = bookings.length;
  const customerTotal = walkinCustomers + appointmentCustomers;
  const walkinShare = customerTotal ? Math.round(walkinCustomers / customerTotal * 100) : 0;
  const invoiceSourceType = inv => {
    const t = String(inv.source_type || "").toLowerCase();
    return t.includes("walk") || walkins.some(w => w.customer_id === inv.source_id) ? "walkin" : "appointment";
  };
  const walkinRevenue = invoices.filter(inv => invoiceSourceType(inv) === "walkin").reduce((n, x) => n + Number(x.total_price || 0), 0);
  const appointmentRevenue = invoices.filter(inv => invoiceSourceType(inv) === "appointment").reduce((n, x) => n + Number(x.total_price || 0), 0);
  const nav = [{ id: "today", label: "Today", Icon: FiCalendar }, { id: "log", label: "Today Log", Icon: FiClipboard }, { id: "upcoming", label: "Upcoming", Icon: FiClock }, { id: "billing", label: "Billing", Icon: FiFileText }, { id: "revenue", label: "Revenue", Icon: FiTrendingUp }, { id: "queries", label: "Query Inbox", Icon: FiInbox }];
  const appointmentCards = (rows) => rows.length ? <div className="desk-records">{rows.map(b => <article className="desk-record" key={b.reference}>
    <div className="desk-record-head"><div><span className="desk-small">{b.reference}</span><h3>{b.name}</h3><p>{b.date} · {b.time} · {b.artist}</p></div><Pill status={b.status} /></div>
    <p className="desk-detail">{b.phone} · {b.email}</p><ServiceLines ids={b.service_ids} total={b.total_price} />
    <div className="desk-actions">
      <a className="desk-smallbtn" href={`tel:${phoneDigits(b.phone)}`}><FiPhone /> Call</a>
      <a className="desk-smallbtn" href={`sms:${phoneDigits(b.phone)}`}><FiMessageSquare /> SMS</a>
      {!terminal(b.status) && <>
        <button className="desk-smallbtn" onClick={() => updateAttendance(b.reference, "arrived")} disabled={!!busy || b.status === "arrived"}>Mark Arrived</button>
        <button className="desk-smallbtn" onClick={() => updateAttendance(b.reference, "absent")} disabled={!!busy || b.status === "absent"}>Mark Absent</button>
        {b.status === "absent" && <button className="desk-smallbtn" onClick={() => updateAttendance(b.reference, "confirmed")} disabled={!!busy}>Reset to Booked</button>}
      </>}
      {(b.status === "arrived" || b.status === "billed" || b.status === "completed") && <button className="desk-smallbtn desk-accent" onClick={() => goBilling(b.reference)}> {b.status === "arrived" ? "Go to Billing" : "View Bill"}</button>}
      {b.status === "completed" && <span className="desk-lock">Finalized — status locked</span>}
    </div>
  </article>)}</div> : <p className="desk-empty">No appointments in this view.</p>;

  return <main className="auren-desk">
    <aside className={`desk-sidebar ${mobileNavOpen ? "is-open" : ""}`} aria-label="Admin navigation">
      <div className="desk-sidebar-brand">
        <img className="desk-brand-logo" src="/auren-favicon.ico" alt="AUREN salon logo" />
        <div><strong>AUREN</strong><small>ADMIN DASHBOARD</small></div>
        <button type="button" className="desk-sidebar-close" aria-label="Close sidebar" onClick={() => setMobileNavOpen(false)}><FiX /></button>
      </div>
      <span className="desk-sidebar-caption">WORKSPACE</span>
      <nav className="desk-nav" aria-label="Salon management sections">
        {nav.map(({ id, label, Icon }) => <button type="button" key={id} onClick={() => selectTab(id)} className={tab === id ? "selected" : ""} aria-current={tab === id ? "page" : undefined}><Icon /><span>{label}</span>{id === "upcoming" && <span className="crm-upcoming-badge">{futureBookings.length}</span>}{id === "queries" && unseenQueries > 0 && <span className="desk-query-unseen" aria-label={`${unseenQueries} unseen enquiries`}>{unseenQueries > 99 ? "99+" : unseenQueries}</span>}</button>)}
      </nav>
      <div className="desk-sidebar-bottom">
        <button type="button" className={`desk-sidebar-setting ${tab === "settings" ? "selected" : ""}`} onClick={() => selectTab("settings")}><FiSettings /><span>Settings</span></button>
        <div className="desk-sidebar-profile"><span className="desk-profile-avatar"><FiUser /></span><div><strong>{adminName}</strong><small>Salon administrator</small></div></div>
      </div>
    </aside>
    {mobileNavOpen && <button type="button" className="desk-sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
    <div className="desk-workspace">
      <header className="desk-header">
        <div className="desk-heading-group">
          <button type="button" className="desk-mobile-menu desk-iconbtn" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><FiMenu /></button>
          <div className="desk-heading-copy crm-header-greeting"><span className="desk-eyebrow">AUREN · STUDIO CRM</span><p><strong>{greeting}, {adminName}</strong><span className="crm-greeting-date"> · {day} · IST</span></p></div>
        </div>
        <div className="crm-centered-section" aria-live="polite" aria-atomic="true"><span className="crm-section-spark" aria-hidden="true" /><span className="crm-section-title" key={tab}>{tab === "settings" ? "Settings" : tab === "today" ? "Today" : nav.find(x => x.id === tab)?.label || "Today"}</span></div>
        <div className="desk-header-actions">
          <span className="desk-welcome"><small>WELCOME BACK</small><strong>{adminName}</strong></span>
          <button type="button" className="desk-iconbtn desk-sound-toggle" title={soundEnabled ? (audioReady ? "Notification sound on" : "Sound on — click/tap once to activate") : "Notification sound off"} aria-label={soundEnabled ? "Mute notification sound" : "Enable notification sound"} onClick={toggleSound}>{soundEnabled ? <FiVolume2 /> : <FiVolumeX />}</button>
          <div className="desk-bell-wrap"><button type="button" className="desk-iconbtn" onClick={() => setBellOpen(v => !v)} aria-label={`Notifications ${unread} unread`} aria-expanded={bellOpen}><FiBell />{unread > 0 && <span className="desk-count">{unread}</span>}</button>
            {bellOpen && <div className="desk-bell"><div className="desk-bell-top"><strong>Appointments & enquiries</strong><button onClick={() => setNotices(old => old.map(x => ({ ...x, read: true })))}>Mark all read</button></div>{notices.length === 0 ? <p className="desk-empty">No new alerts</p> : notices.map(n => <button className="desk-notice" key={n.id} onClick={() => { setNotices(old => old.map(x => x.id === n.id ? { ...x, read: true } : x)); selectTab(n.kind === "query" ? "queries" : "today"); if (n.kind !== "query") setTodayTab("appointments"); }}>{n.read ? "" : "● "}{n.kind === "query" ? "Enquiry" : "Appointment"}: {n.name} · {n.time}<small>{n.id}</small></button>)}</div>}</div>
          <button type="button" className="desk-smallbtn desk-refresh-button" onClick={() => refresh()}><FiRefreshCw /><span>Refresh</span></button>
        </div>
      </header>
      <div className="desk-stats crm-main-stats"><div><span>Total Bookings</span><strong>{stats?.total_bookings ?? "—"}</strong></div><div><span>Total Walk-ins</span><strong>{stats?.total_walkins ?? "—"}</strong></div><div><span>Today's Appointments</span><strong>{stats?.today_appointments ?? "—"}</strong></div><div><span>Invoiced Revenue</span><strong>{stats ? money(stats.total_revenue) : "—"}</strong></div></div>
      {loading && <p className="desk-empty">Loading salon records…</p>}
      {error && <p className="desk-error" role="alert">{error}</p>}
      {tab === "today" && <section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">RECEPTION / TODAY</span><h2>Today's Customer Desk</h2></div><span className="desk-muted">Manage attendance and walk-in customers</span></div>
        <GlassTabs className="crm-section-tabs" items={[{ id: "appointments", label: "Appointments", count: todayBookings.length }, { id: "walkins", label: "Walk-ins", count: todayWalkins.length }]} value={todayTab} onChange={setTodayTab} />
        {todayTab === "appointments" && <div className="crm-next-up"><FiClock /><div><small>NEXT APPOINTMENT</small><strong>{nextTodayAppointment ? `${nextTodayAppointment.name} · ${nextTodayAppointment.time}` : "No further appointments today"}</strong></div><span>{completedTodayCount} completed</span></div>}
        {todayTab === "appointments" && <><div className="desk-search"><FiSearch /><input name="today_appointment_search" placeholder="Search Booking ID, customer name, phone or email" value={search} onChange={e => setSearch(e.target.value)} /></div>{appointmentCards(todayBookings.filter(b => matches(b, search)))}</>}
        {todayTab === "walkins" && <div className="desk-walkgrid crm-walkins-workspace"><form className="desk-inner crm-walkin-register" onSubmit={registerWalkin}><h3><FiUserPlus /> New Walk-in</h3><label>Customer name<input name="walkin_customer_name" id="walkin_customer_name" autoComplete="name" value={walkName} onChange={e => setWalkName(e.target.value)} maxLength={80} required placeholder="Customer name" /></label><label>Phone number<input name="walkin_customer_phone" id="walkin_customer_phone" autoComplete="tel" value={walkPhone} onChange={e => setWalkPhone(e.target.value)} required placeholder="Phone" type="tel" /></label><p className="desk-small">SELECT SERVICES</p><div className="desk-checks">{SERVICES.map(([id, name, price]) => <label key={id}><span><input name="walkin_services" type="checkbox" checked={walkServices.includes(id)} onChange={() => setWalkServices(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])} />{name}</span><strong>{money(price)}</strong></label>)}</div><ServiceLines ids={walkServices} total={walkServices.reduce((n, id) => n + (SERVICE_LOOKUP[id]?.price || 0), 0)} /><button className="desk-primary" disabled={!walkServices.length || !!busy}>{busy === "walkin" ? "REGISTERING…" : "REGISTER WALK-IN"}</button>{registered && <div className="desk-success">Registered: <strong>{registered.customer_id}</strong><button type="button" className="desk-smallbtn" onClick={() => goBilling(registered.customer_id)}>Generate Bill →</button></div>}</form>
          <div className="desk-inner crm-walkin-list"><div className="crm-walkin-title"><h3>Today's Walk-ins</h3><span className="crm-walkin-count">{todayWalkins.length} registered</span></div><div className="desk-search crm-walkin-search"><FiSearch /><input name="today_walkin_search" placeholder="Search ID, name or number" value={walkinSearch} onChange={e => { setWalkinSearch(e.target.value); setWalkinPage(1); }} /></div>{pagedTodayWalkins.map(w => <div className="desk-walkitem" key={w.customer_id}><div className="desk-record-head"><div><strong>{w.name}</strong><small>{w.customer_id} · {w.phone}</small></div><Pill status={w.status} /></div><ServiceLines ids={w.service_ids} total={w.total_price} /><button className="desk-smallbtn desk-accent" onClick={() => goBilling(w.customer_id)}> {w.status === "completed" ? "View Bill" : "Generate / View Bill"}</button></div>)}{!filteredTodayWalkins.length && <p className="desk-empty">{todayWalkins.length ? "No matching walk-ins." : "No walk-ins registered today."}</p>}{filteredTodayWalkins.length > 2 && <div className="crm-walkin-pagination" aria-label="Walk-in history pages"><button type="button" className="crm-walkin-page-btn" onClick={() => setWalkinPage(p => Math.max(1, Math.min(p, walkinPageCount) - 1))} disabled={currentWalkinPage === 1}>← Previous</button><span className="crm-walkin-page-label">Page {currentWalkinPage} of {walkinPageCount}</span><button type="button" className="crm-walkin-page-btn" onClick={() => setWalkinPage(p => Math.min(walkinPageCount, p + 1))} disabled={currentWalkinPage === walkinPageCount}>Next →</button></div>}</div></div>}
      </section>}
      {tab === "upcoming" && <section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">SCHEDULE</span><h2>Upcoming Appointments</h2></div><span className="desk-muted">Today from current time onwards + future days</span></div><div className="desk-search"><FiSearch /><input name="upcoming_search" placeholder="Search Booking ID, name, phone, email" value={search} onChange={e => setSearch(e.target.value)} /></div>{appointmentCards(futureBookings.filter(b => matches(b, search)))}</section>}
      {tab === "log" && <section className="desk-panel desk-today-log">
        <div className="desk-panel-heading"><div><span className="desk-eyebrow">DAILY ACTIVITY · {day}</span><h2>Today Log</h2><p className="desk-muted">A complete view of today's reception activity.</p></div><span className="desk-muted">Times in Asia/Kolkata</span></div>
        <div className="desk-log-summary">
          <div><span>Appointments</span><strong>{(log?.appointments || []).length}</strong></div>
          <div><span>Walk-ins</span><strong>{(log?.walkins || []).length}</strong></div>
          <div><span>Invoices</span><strong>{(log?.invoices || []).length}</strong></div>
          <div><span>Updates</span><strong>{(log?.events || []).length}</strong></div>
        </div>
        <div className="desk-search"><FiSearch /><input id="today_log_search" name="today_log_search" placeholder="Find booking, walk-in, invoice ID or customer" value={logSearch} onChange={e => setLogSearch(e.target.value)} /></div>
        <div className="desk-log-columns">
          <section className="desk-log-section crm-log-appointments"><div className="desk-log-heading"><FiCalendar /><h3>Appointments</h3><span>{(log?.appointments || []).length}</span></div>
            {(log?.appointments || []).filter(x => !logSearch || [x.reference, x.customer_name].some(v => norm(v).includes(norm(logSearch)))).map(x => <article className="desk-log-row" key={x.reference}><div><strong>{x.customer_name}</strong><span>{x.reference}</span></div><div className="desk-log-row-end"><time>{`${String(Math.floor(x.start_min / 60)).padStart(2, "0")}:${String(x.start_min % 60).padStart(2, "0")}`}</time><Pill status={x.status} /></div></article>)}
            {!(log?.appointments || []).some(x => !logSearch || [x.reference, x.customer_name].some(v => norm(v).includes(norm(logSearch)))) && <p className="desk-empty">No matching appointments.</p>}
          </section>
          <section className="desk-log-section crm-log-walkins"><div className="desk-log-heading"><FiUserPlus /><h3>Walk-ins</h3><span>{(log?.walkins || []).length}</span></div>
            {(log?.walkins || []).filter(x => !logSearch || [x.customer_id, x.customer_name].some(v => norm(v).includes(norm(logSearch)))).map(x => <article className="desk-log-row" key={x.customer_id}><div><strong>{x.customer_name}</strong><span>{x.customer_id}</span></div><div className="desk-log-row-end"><time>{dateTime(x.created_at)}</time><Pill status={x.status} /></div></article>)}
            {!(log?.walkins || []).some(x => !logSearch || [x.customer_id, x.customer_name].some(v => norm(v).includes(norm(logSearch)))) && <p className="desk-empty">No matching walk-ins.</p>}
          </section>
          <section className="desk-log-section crm-log-invoices"><div className="desk-log-heading"><FiFileText /><h3>Payments & Invoices</h3><span>{(log?.invoices || []).length}</span></div>
            {(log?.invoices || []).filter(x => !logSearch || [x.source_id, x.invoice_id, x.customer_name].some(v => norm(v).includes(norm(logSearch)))).map(x => <article className="desk-log-row" key={x.invoice_id}><div><strong>{x.customer_name}</strong><span>{x.invoice_id} · {x.source_id}</span><small>{(x.payment_method || "—").toUpperCase()} · {dateTime(x.created_at)}</small></div><div className="desk-log-row-end"><strong className="desk-log-amount">{money(x.total_price)}</strong><span className="desk-log-note">{x.printed_at ? "Completed / Printed" : "Billed"}</span></div></article>)}
            {!(log?.invoices || []).some(x => !logSearch || [x.source_id, x.invoice_id, x.customer_name].some(v => norm(v).includes(norm(logSearch)))) && <p className="desk-empty">No matching invoices.</p>}
          </section>
          <section className="desk-log-section crm-log-events"><div className="desk-log-heading"><FiClipboard /><h3>Attendance & Activity</h3><span>{(log?.events || []).length}</span></div>
            {(log?.events || []).filter(x => !logSearch || [x.source_id, x.details].some(v => norm(v).includes(norm(logSearch)))).map((x, i) => <article className="desk-log-row" key={`${x.source_id}-${x.created_at}-${i}`}><div><strong>{displayStatus(x.event_type)}</strong><span>{x.source_id}</span><small>{x.details}</small></div><time>{dateTime(x.created_at)}</time></article>)}
            {!(log?.events || []).some(x => !logSearch || [x.source_id, x.details].some(v => norm(v).includes(norm(logSearch)))) && <p className="desk-empty">No matching activity.</p>}
          </section>
        </div>
      </section>}
      {tab === "billing" && <section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">PAYMENTS / INVOICE</span><h2>Customer Billing</h2></div><span className="desk-muted">Search booking or walk-in ID, name or phone</span></div><form className="desk-billform" onSubmit={generateInvoice}><label>Booking / Walk-in reference<input name="billing_customer_reference" id="billing_customer_reference" autoComplete="off" value={billingId} onChange={e => { setBillingId(e.target.value); setBillingShowSuggestions(true); setSelectedInvoice(null); }} placeholder="Search by name, Booking / Walk-in ID or mobile number" required /></label>{billingShowSuggestions && billingId.trim() && <div className="desk-suggestions">{billingMatches.length ? billingMatches.map(c => <button type="button" key={c.source_id} onClick={() => { setBillingId(c.source_id); setBillingShowSuggestions(false); setSelectedInvoice(invoices.find(x => x.source_id === c.source_id) || null); }}><strong>{c.name} · {c.source_id}</strong><span>{c.phone} · {money(c.total_price)} · {c.already_billed ? "Already Billed" : displayStatus(c.status)}</span></button>) : <p className="desk-muted">No matching customers</p>}</div>}{lookupCustomer && <div className="desk-inner"><strong>{lookupCustomer.name} — {lookupCustomer.id}</strong><ServiceLines ids={lookupCustomer.service_ids} total={lookupCustomer.total_price} /><Pill status={lookupCustomer.status} /></div>}<fieldset className="desk-payment-panel"><legend>Payment method <span className="desk-payment-required">· Required</span></legend><p className="desk-payment-hint">Choose how the customer paid. No method is selected by default.</p><div className="desk-methods">{[["cash", "Cash"], ["upi", "UPI"], ["card", "Card"]].map(([value, label]) => <label key={value} className={billingMethod === value ? "is-selected" : ""}><input name="payment_method" type="radio" value={value} checked={billingMethod === value} onChange={() => setBillingMethod(value)} required />{label}</label>)}</div></fieldset><button className="desk-primary" disabled={!!busy || !billingId.trim() || !billingMethod}>{busy === "invoice" ? "GENERATING…" : "GENERATE INVOICE"}</button><p className="desk-muted">Appointments must be marked Arrived before billing. One invoice per ID.</p></form>
        <p className="desk-muted desk-billing-help">Invoice opens in a small receipt preview and the browser Print dialog. Use Recent Invoices to reprint.</p>
        <div className="desk-inner crm-invoice-ledger"><div className="crm-ledger-head"><div><span className="desk-eyebrow">BILLING HISTORY</span><h3>Recent Invoices</h3></div><span className="crm-ledger-total">{invoices.length} records</span></div>
          <div className="crm-invoice-scroll">{invoices.map(inv => <article className="crm-invoice-item" key={inv.invoice_id}>
            <div className="crm-invoice-identity"><span className="crm-invoice-icon"><FiFileText /></span><div><strong>{inv.name}</strong><small>{inv.invoice_id}</small><small>Customer ID: {inv.source_id}</small></div></div>
            <div className="crm-invoice-metadata"><span className="crm-method-chip">{(inv.payment_method || "unspecified").toUpperCase()}</span><small>{dateTime(inv.created_at)}</small><small>{displayStatus(inv.status)}</small></div>
            <div className="crm-invoice-amount"><strong>{money(inv.total_price)}</strong><button className="desk-smallbtn" onClick={() => openInvoice(inv, true)}><FiPrinter /> View / Print</button></div>
          </article>)}{!invoices.length && <p className="desk-empty">No invoices yet.</p>}</div></div>
      </section>}
      {tab === "revenue" && <section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">FINANCIAL SUMMARY</span><h2>Revenue</h2></div><span className="desk-muted">Invoice totals (demo)</span></div><div className="desk-stats"><div><span>Total invoiced</span><strong>{stats ? money(stats.total_revenue) : "—"}</strong></div><div><span>Invoices generated</span><strong>{stats?.total_invoices ?? "—"}</strong></div><div><span>Walk-in customers</span><strong>{walkinCustomers}</strong></div><div><span>Appointment customers</span><strong>{appointmentCustomers}</strong></div></div>
        <div className="crm-revenue-sources">
          <section className="desk-inner crm-mix-panel"><span className="desk-eyebrow">CUSTOMER CHANNELS</span><h3>Where customers come from</h3>
            <div className="crm-mix-content"><div className="crm-donut" style={{ "--walkin-pct": `${walkinShare}%` }} role="img" aria-label={`${walkinCustomers} walk-in customers and ${appointmentCustomers} appointment customers`}><div><strong>{customerTotal}</strong><small>Customers</small></div></div>
              <div className="crm-mix-legend"><div><span className="crm-mix-dot walkin" /><span>Walk-ins</span><strong>{walkinCustomers}</strong><small>{walkinShare}%</small></div><div><span className="crm-mix-dot appointment" /><span>Appointments</span><strong>{appointmentCustomers}</strong><small>{customerTotal ? 100 - walkinShare : 0}%</small></div></div></div>
            <p className="desk-muted">Customer record counts, not unique individuals.</p>
          </section>
          <section className="desk-inner crm-channel-revenue"><span className="desk-eyebrow">INVOICED BY CHANNEL</span><h3>Revenue sources</h3>
            <div className="crm-channel-card walkin"><span>Walk-in invoices</span><strong>{money(walkinRevenue)}</strong><small>Invoiced revenue</small></div>
            <div className="crm-channel-card appointment"><span>Appointment invoices</span><strong>{money(appointmentRevenue)}</strong><small>Invoiced revenue</small></div>
          </section>
        </div><div className="desk-inner desk-revenue-chart"><div className="desk-chart-heading"><h3>Last 7 days</h3><span className="desk-muted">Daily invoiced total · INR</span></div><div className="desk-bars" role="img" aria-label="Last seven days invoiced revenue">{revenueDays.map(d => <div className="desk-bar-group" key={d.key} title={`${d.key}: ${money(d.amount)}`}><span className="desk-bar-value">{d.amount ? money(d.amount) : "—"}</span><div className="desk-bar-track"><div className="desk-bar-fill" style={{ height: `${d.amount ? Math.max(6, 100 * d.amount / revenueMax) : 0}%` }} /></div><span className="desk-bar-label">{d.label}</span></div>)}</div></div><div className="desk-inner"><h3>Revenue records</h3>{invoices.map(inv => <div key={inv.invoice_id} className="desk-logitem"><span className="desk-small">{inv.invoice_id} · {dateTime(inv.created_at)}</span><strong>{inv.name} — {money(inv.total_price)}</strong><span>{inv.payment_method?.toUpperCase()} · {inv.source_id}</span></div>)}</div><p className="desk-muted">Invoice generation is recorded as invoiced revenue; payment settlement is not externally verified.</p></section>}
      {tab === "queries" && <section className="desk-panel desk-query-inbox">
        <div className="crm-inbox-heading">
          <div><span className="desk-eyebrow">AUREN / CUSTOMER RELATIONS</span><h2>Customer conversations<span className="crm-title-dot">.</span></h2><p className="desk-muted">Every enquiry, beautifully organised in one workspace.</p></div>
          <div className="crm-query-overview" aria-label="Enquiry overview">
            <span className="crm-overview-stat crm-overview-new"><strong>{enquiries.filter(q => q.status !== "resolved").length}</strong><small>OPEN</small></span>
            <span className="crm-overview-stat crm-overview-done"><strong>{enquiries.filter(q => q.status === "resolved").length}</strong><small>RESOLVED</small></span>
            <span className="crm-overview-stat"><strong>{enquiries.length}</strong><small>ALL TIME</small></span>
          </div>
        </div>
        <div className="crm-inbox-toolbar">
          <GlassTabs className="crm-section-tabs crm-query-liquid-tabs" items={[{ id: "new", label: "New / Open", count: enquiries.filter(q => q.status !== "resolved").length }, { id: "resolved", label: "Resolved", count: enquiries.filter(q => q.status === "resolved").length }]} value={queryTab} onChange={setQueryTab} />
          <label className="crm-query-search"><FiSearch /><input aria-label="Search enquiries" placeholder="Search conversations..." value={querySearch} onChange={e => setQuerySearch(e.target.value)} /></label>
        </div>
        <div className="crm-mailbox">
          <div className="crm-message-list" aria-label="Enquiry list">
            <div className="crm-list-top"><span>CONVERSATIONS</span><span>{visibleQueries.length} RESULTS</span></div>
            {visibleQueries.map(q => <button type="button" key={q.id} onClick={() => setSelectedQueryId(q.id)} className={`crm-mail-item ${selectedQuery?.id === q.id ? "is-selected" : ""} ${q.status === "new" ? "is-new" : ""}`} aria-pressed={selectedQuery?.id === q.id}>
              <span className="crm-mail-avatar" aria-hidden="true">{(q.name || "?").trim().slice(0, 1).toUpperCase()}</span>
              <span className="crm-mail-item-copy"><span className="crm-mail-row"><strong>{q.name || "Customer"}</strong><small>{dateTime(q.created_at)}</small></span><span className="crm-mail-subject">{q.subject || "General enquiry"}</span><span className="crm-mail-preview">{q.message}</span></span>
              {q.status === "new" && <span className="crm-unread-dot" aria-label="New message" />}
            </button>)}
            {!visibleQueries.length && <div className="crm-mail-empty"><FiInbox /><strong>No conversations found</strong><p>{querySearch ? "Try another search term." : queryTab === "resolved" ? "Resolved enquiries will appear here." : "You are all caught up."}</p></div>}
          </div>
          <div className="crm-message-detail">
            {selectedQuery ? <>
              <div className="crm-detail-top"><span className="desk-eyebrow">MESSAGE DETAILS</span><span className={`desk-query-badge is-${selectedQuery.status}`}>{selectedQuery.status.toUpperCase()}</span></div>
              <h3>{selectedQuery.subject || "General enquiry"}</h3>
              <p className="crm-detail-timestamp"><FiClock /> Received {dateTime(selectedQuery.created_at)}</p>
              <div className="crm-query-detail-grid"><div className="crm-sender">
                <div className="crm-sender-avatar">{(selectedQuery.name || "?").trim().slice(0, 1).toUpperCase()}</div>
                <div className="crm-sender-copy"><span>FROM</span><strong>{selectedQuery.name}</strong><a href={`mailto:${selectedQuery.email}`}>{selectedQuery.email}</a></div>
                {selectedQuery.phone && <a className="crm-sender-phone" href={`tel:${phoneDigits(selectedQuery.phone)}`}><FiPhone /> {selectedQuery.phone}</a>}
              </div>
                <div className="crm-message-body"><span>MESSAGE</span><p>{selectedQuery.message}</p></div></div>
              <div className="crm-detail-actions">
                <a className="desk-primary" href={`mailto:${selectedQuery.email}?subject=${encodeURIComponent(`Re: ${selectedQuery.subject} — AUREN`)}`}><FiMessageSquare /> Reply via Email</a>
                {selectedQuery.phone && <a className="desk-smallbtn" href={`tel:${phoneDigits(selectedQuery.phone)}`}><FiPhone /> Call</a>}
                {selectedQuery.phone && <a className="desk-smallbtn crm-sms-btn" href={`sms:${phoneDigits(selectedQuery.phone)}`}><FiMessageSquare /> Send SMS</a>}
                {selectedQuery.status === "new" && <button type="button" className="desk-smallbtn" disabled={!!busy} onClick={() => setEnquiryStatus(selectedQuery.id, "read")}>Mark Read</button>}
                {selectedQuery.status !== "resolved" && <button type="button" className="desk-smallbtn crm-resolve-btn" disabled={!!busy} onClick={() => setEnquiryStatus(selectedQuery.id, "resolved")}><FiCheck /> Resolve</button>}
              </div>
            </> : <div className="crm-no-selection"><FiInbox /><h3>No message selected</h3><p>Choose a conversation from the left to view its details.</p></div>}
          </div>
        </div>
      </section>}
      {tab === "settings" && <section className="desk-panel desk-settings-page">
        <div className="desk-panel-heading"><div><span className="desk-eyebrow">CONTROL CENTER</span><h2>Settings & Administration</h2><p className="desk-muted">Manage your current admin session and salon demo preferences.</p></div><span className="desk-settings-symbol"><FiSettings /></span></div>
        <div className="desk-settings-grid">
          <article className="desk-inner desk-settings-card"><span className="desk-setting-icon"><FiUser /></span><h3>Administrator</h3><p className="desk-muted">Current role: Salon Admin</p><div className="desk-setting-detail"><span>Session</span><strong>Active</strong></div><div className="desk-setting-detail"><span>Access</span><strong>Reception dashboard</strong></div><button type="button" className="desk-smallbtn desk-settings-action" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/admin/login`).then(() => setToast("Admin login URL copied")).catch(() => setToast("Open /admin/login to sign in")); }}><FiExternalLink /> Copy admin login link</button></article>
          <article className="desk-inner desk-settings-card"><span className="desk-setting-icon"><FiShield /></span><h3>Admin Management</h3><p className="desk-muted">Existing demo uses one administrator account, configured in Flask environment variables.</p><button type="button" className="desk-smallbtn desk-settings-action" disabled title="Multi-admin accounts require a protected backend endpoint"><FiPlus /> Add another admin</button><p className="desk-setting-hint">Multi-admin creation is not enabled in this single-admin demo. No credentials are stored in the browser.</p></article>
          <article className="desk-inner desk-settings-card"><span className="desk-setting-icon"><FiLogOut /></span><h3>Account & Security</h3><p className="desk-muted">Finish a demonstration securely by signing out. Booking data stays intact.</p><button type="button" className="desk-primary desk-logout-action" onClick={logout}><FiLogOut /> Sign out of admin</button><p className="desk-setting-hint">You'll return to the AUREN admin login screen.</p></article>
        </div>
      </section>}
      {selectedInvoice && <div className="desk-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedInvoice(null); }}>
        <section className="desk-receipt-dialog" role="dialog" aria-modal="true" aria-label="Invoice preview">
          <div className="desk-receipt-toolbar"><div><strong>Invoice preview</strong><p>80 mm thermal receipt · Browser print</p></div><button type="button" className="desk-iconbtn" aria-label="Close invoice" onClick={() => setSelectedInvoice(null)}><FiX /></button></div>
          <div className="desk-receipt" id="auren-print-invoice">
            <div className="desk-receipt-brand"><h2>AUREN</h2><p>HAIR & BEAUTY ATELIER</p><span>DEMO INVOICE</span></div>
            <div className="desk-receipt-rule" />
            <dl className="desk-receipt-metadata"><div><dt>Invoice</dt><dd>{selectedInvoice.invoice_id}</dd></div><div><dt>Date</dt><dd>{dateTime(selectedInvoice.created_at)}</dd></div><div><dt>Customer</dt><dd>{selectedInvoice.name}</dd></div><div><dt>Ref</dt><dd>{selectedInvoice.source_id}</dd></div><div><dt>Payment</dt><dd>{selectedInvoice.payment_method?.toUpperCase()}</dd></div></dl>
            <div className="desk-receipt-rule" /><div className="desk-receipt-items"><div className="desk-receipt-items-head"><span>Service</span><span>Amount</span></div>{(selectedInvoice.items || []).map((item, index) => <div key={`${item.id}-${index}`}><span>{item.name}</span><strong>{money(item.price)}</strong></div>)}</div>
            <div className="desk-receipt-rule" /><div className="desk-receipt-total"><span>TOTAL</span><strong>{money(selectedInvoice.total_price)}</strong></div><div className="desk-receipt-rule" />
            <p className="desk-receipt-foot">Thank you for visiting AUREN.</p><p className="desk-receipt-foot">Demo invoice · No separate tax applied</p>
          </div>
          <div className="desk-receipt-actions"><button type="button" className="desk-smallbtn" onClick={() => window.print()}><FiPrinter /> Print / Save PDF</button>{selectedInvoice.status !== "completed" && <button type="button" className="desk-primary" onClick={completeInvoice} disabled={!!busy}><FiCheck /> Confirm printed / Complete</button>}</div>
          <p className="desk-receipt-note">Use the browser's native Print dialog and choose your 80 mm thermal printer / paper size. Printing alone does not mark this customer completed.</p>
        </section>
      </div>}
      {toast && <div className="desk-toast" role="status"><span className="desk-toast-icon"><FiBell /></span><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss"><FiX /></button></div>}
    </div>
  </main>;
}
