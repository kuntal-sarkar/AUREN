import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiLogOut, FiCalendar, FiClock, FiFileText, FiTrendingUp, FiClipboard, FiUserPlus, FiCheck, FiPrinter, FiSearch, FiPhone, FiMessageSquare, FiRefreshCw, FiX, FiSettings, FiUser, FiShield, FiPlus, FiExternalLink, FiMenu, FiChevronLeft } from "react-icons/fi";
import "./AdminDashboard.css";

const API = import.meta.env.VITE_BOOKING_API_URL || "http://127.0.0.1:5001";
const SERVICES = [
  ["haircut", "Haircut", 1200], ["styling", "Hair Styling", 900], ["color", "Hair Color", 2800],
  ["facial", "Facial", 2200], ["makeup", "Makeup", 2500], ["bridal", "Bridal", 1500],
];
const SERVICE_LOOKUP = Object.fromEntries(SERVICES.map(([id,name,price])=>[id,{name,price}]));
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const todayIST = () => new Date().toLocaleDateString("sv-SE", {timeZone:"Asia/Kolkata"});
const dateTime = (v) => v ? new Date(v).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}) : "—";
const hhmm = (label) => {
  const match = String(label||"").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "00:00";
  const h = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(h).padStart(2,"0")}:${match[2]}`;
};
const norm = (value) => String(value || "").toLowerCase().trim();
const matches = (item, q) => !q || [item.reference,item.customer_id,item.name,item.phone,item.email].some(x => norm(x).includes(norm(q)));
const terminal = (status) => ["billed","completed","cancelled"].includes(status);
const displayStatus = (s) => ({confirmed:"Booked",arrived:"Arrived / Attending",absent:"Absent / No-show",billed:"Billed — Pending Print",completed:"Completed / Bill Printed",cancelled:"Cancelled",registered:"Registered"}[s] || s || "—");
const phoneDigits = (p) => String(p||"").replace(/[^\d+]/g,"");

function ServiceLines({ ids=[], total }) {
  return <div className="desk-lines">{ids.map((id)=><div key={id}><span>{SERVICE_LOOKUP[id]?.name || id}</span><span>{SERVICE_LOOKUP[id] ? money(SERVICE_LOOKUP[id].price) : "—"}</span></div>)}<div className="desk-line-total"><strong>Total</strong><strong>{money(total)}</strong></div></div>;
}
function Pill({ status }) {return <span className={`desk-pill desk-pill-${status||"confirmed"}`}>{displayStatus(status)}</span>;}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("auren_admin_token");
  const [tab, setTab] = useState("today");
  const [adminName, setAdminName] = useState("Admin");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [todayTab, setTodayTab] = useState("appointments");
  const [bookings,setBookings] = useState([]);
  const [walkins,setWalkins] = useState([]);
  const [invoices,setInvoices] = useState([]);
  const [stats,setStats] = useState(null);
  const [log,setLog] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState("");
  const [search,setSearch] = useState("");
  const [logSearch,setLogSearch] = useState("");
  const [bellOpen,setBellOpen] = useState(false);
  const [notices,setNotices] = useState([]);
  const [toast,setToast] = useState(null);
  const known = useRef(new Set());
  const initialized = useRef(false);
  const [walkName,setWalkName] = useState("");
  const [walkPhone,setWalkPhone] = useState("");
  const [walkServices,setWalkServices] = useState([]);
  const [registered,setRegistered] = useState(null);
  const [billingId,setBillingId] = useState("");
  const [billingMethod,setBillingMethod] = useState("");
  const [billingMatches,setBillingMatches] = useState([]);
  const [billingShowSuggestions,setBillingShowSuggestions] = useState(false);
  const [selectedInvoice,setSelectedInvoice] = useState(null);
  const [printSequence,setPrintSequence] = useState(0);

  const request = useCallback(async (path, opts={}) => {
    const resp = await fetch(`${API}${path}`,{
      ...opts,cache:"no-store",
      headers:{Authorization:`Bearer ${token}`,...(opts.body?{"Content-Type":"application/json"}:{}),...opts.headers},
    });
    if(resp.status===401) {sessionStorage.removeItem("auren_admin_token");navigate("/admin/login",{replace:true});throw new Error("Session expired. Log in again.");}
    const data=await resp.json();
    if(!resp.ok) {const err=new Error(data.error||"Request failed");err.payload=data;throw err;}
    return data;
  },[navigate,token]);

  const refresh = useCallback(async ({silent=false}={}) => {
    if(!token) return;
    if(!silent) setLoading(true);
    try {
      const [br, wr, ir, sr, lr] = await Promise.all([
        request("/api/admin/bookings"),request("/api/admin/walkins"),
        request("/api/admin/invoices"),request("/api/admin/stats"),request("/api/admin/today-log"),
      ]);
      const fresh=br.bookings||[];
      if(initialized.current) {
        const added=fresh.filter(b=>!known.current.has(b.reference));
        if(added.length){setNotices(old=>[...added.map(b=>({id:b.reference,name:b.name,time:b.time,read:false})),...old].slice(0,30));setToast(`${added.length} new appointment${added.length>1?"s":""} received`);}
      }
      fresh.forEach(b=>known.current.add(b.reference));initialized.current=true;
      setBookings(fresh);setWalkins(wr.walkins||[]);setInvoices(ir.invoices||[]);setStats(sr);setLog(lr);
      setError("");
    } catch(e){setError(e.message);}finally{setLoading(false);}
  },[token,request]);

  useEffect(()=>{if(!token){navigate("/admin/login",{replace:true});return;} refresh();const id=setInterval(()=>refresh({silent:true}),10000);return()=>clearInterval(id);},[token,navigate,refresh]);
  useEffect(()=>{
    if (!token) return;
    let mounted=true;
    request("/api/admin/me").then(info=>{
      if(mounted && typeof info.username==="string" && info.username.trim())setAdminName(info.username.trim());
    }).catch(()=>{});
    return()=>{mounted=false;};
  },[token,request]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(id);},[toast]);
  useEffect(()=>{
    if(!billingShowSuggestions || !billingId.trim()){setBillingMatches([]);return;}
    const controller=new AbortController();
    const id=setTimeout(()=>request(`/api/admin/customers/search?q=${encodeURIComponent(billingId.trim())}`,{signal:controller.signal}).then(r=>setBillingMatches(r.customers||[])).catch(e=>{if(e.name!=="AbortError")setBillingMatches([]);}),250);
    return()=>{clearTimeout(id);controller.abort();};
  },[billingId,billingShowSuggestions,request]);

  function selectTab(next){setTab(next);setSearch("");setBellOpen(false);setMobileNavOpen(false);}
  function logout(){sessionStorage.removeItem("auren_admin_token");navigate("/admin/login",{replace:true});}
  function goBilling(id){setBillingId(id);setBillingMethod("");setBillingShowSuggestions(false);setSelectedInvoice(invoices.find(x=>x.source_id===id)||null);setTab("billing");setError("");}
  async function updateAttendance(ref,status){
    if(busy)return;setBusy(ref);setError("");
    try{await request(`/api/admin/bookings/${ref}/attendance`,{method:"POST",body:JSON.stringify({status})});await refresh({silent:true});setToast(`Appointment marked ${displayStatus(status)}`);}
    catch(e){setError(e.message);}finally{setBusy("");}
  }
  async function registerWalkin(e){
    e.preventDefault();setBusy("walkin");setRegistered(null);setError("");
    try{const data=await request("/api/admin/walkins",{method:"POST",body:JSON.stringify({name:walkName.trim(),phone:walkPhone.trim(),service_ids:walkServices})});setRegistered(data);setWalkName("");setWalkPhone("");setWalkServices([]);await refresh({silent:true});}
    catch(e){setError(e.message);}finally{setBusy("");}
  }
  async function generateInvoice(e){
    e.preventDefault();if(!billingId.trim() || !billingMethod || busy)return;setBusy("invoice");setError("");
    try{const data=await request("/api/admin/invoices",{method:"POST",body:JSON.stringify({customer_id:billingId.trim().toUpperCase(),payment_method:billingMethod})});setSelectedInvoice(data.invoice);setPrintSequence(x=>x+1);setBillingShowSuggestions(false);setBillingId("");setBillingMethod("");setBillingMatches([]);await refresh({silent:true});setToast("Invoice generated");}
    catch(e){if(e.payload?.invoice){setSelectedInvoice(e.payload.invoice);}setError(e.message);}finally{setBusy("");}
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

  async function completeInvoice(){if(!selectedInvoice || busy)return;setBusy("complete");setError("");
    try{const data=await request(`/api/admin/invoices/${selectedInvoice.invoice_id}/complete`,{method:"POST"});setSelectedInvoice(data.invoice);setBillingId("");setBillingMethod("");setBillingMatches([]);await refresh({silent:true});setToast("Status locked: Completed / Bill Printed");}
    catch(e){setError(e.message);}finally{setBusy("");}
  }
  const day=todayIST();
  const timeNow = new Date().toLocaleTimeString("en-GB",{timeZone:"Asia/Kolkata",hour12:false,hour:"2-digit",minute:"2-digit"});
  const todayBookings=bookings.filter(b=>b.date===day).sort((a,b)=>hhmm(a.time).localeCompare(hhmm(b.time)));
  const todayWalkins=walkins.filter(w=>w.created_at?.slice(0,10)===day);
  const futureBookings=bookings.filter(b=>!(["completed","billed","absent","cancelled"].includes(b.status)) && (b.date>day || (b.date===day && hhmm(b.time)>=timeNow))).sort((a,b)=>a.date.localeCompare(b.date)||hhmm(a.time).localeCompare(hhmm(b.time)));
  const unread=notices.filter(n=>!n.read).length;
  const lookupCustomer=[...bookings.map(b=>({...b,id:b.reference})),...walkins.map(w=>({...w,id:w.customer_id}))].find(x=>x.id===billingId.trim().toUpperCase());
  const revenueDays = Array.from({length:7}, (_, index) => {
    const now = new Date();
    const indianDate = new Date(now.toLocaleString("en-US", {timeZone:"Asia/Kolkata"}));
    indianDate.setDate(indianDate.getDate() - (6-index));
    const key = `${indianDate.getFullYear()}-${String(indianDate.getMonth()+1).padStart(2,"0")}-${String(indianDate.getDate()).padStart(2,"0")}`;
    const amount = invoices.filter(inv => inv.created_at?.slice(0,10) === key).reduce((sum,inv) => sum + Number(inv.total_price||0), 0);
    return {key, label: indianDate.toLocaleDateString("en-IN", {weekday:"short"}), amount};
  });
  const revenueMax = Math.max(1,...revenueDays.map(x=>x.amount));
  const nav=[{id:"today",label:"Today",Icon:FiCalendar},{id:"log",label:"Today Log",Icon:FiClipboard},{id:"upcoming",label:"Upcoming",Icon:FiClock},{id:"billing",label:"Billing",Icon:FiFileText},{id:"revenue",label:"Revenue",Icon:FiTrendingUp}];
  const appointmentCards=(rows)=>rows.length ? <div className="desk-records">{rows.map(b=><article className="desk-record" key={b.reference}>
    <div className="desk-record-head"><div><span className="desk-small">{b.reference}</span><h3>{b.name}</h3><p>{b.date} · {b.time} · {b.artist}</p></div><Pill status={b.status}/></div>
    <p className="desk-detail">{b.phone} · {b.email}</p><ServiceLines ids={b.service_ids} total={b.total_price}/>
    <div className="desk-actions">
      <a className="desk-smallbtn" href={`tel:${phoneDigits(b.phone)}`}><FiPhone/> Call</a>
      <a className="desk-smallbtn" href={`sms:${phoneDigits(b.phone)}`}><FiMessageSquare/> SMS</a>
      {!terminal(b.status) && <>
        <button className="desk-smallbtn" onClick={()=>updateAttendance(b.reference,"arrived")} disabled={!!busy || b.status==="arrived"}>Mark Arrived</button>
        <button className="desk-smallbtn" onClick={()=>updateAttendance(b.reference,"absent")} disabled={!!busy || b.status==="absent"}>Mark Absent</button>
        {b.status==="absent" && <button className="desk-smallbtn" onClick={()=>updateAttendance(b.reference,"confirmed")} disabled={!!busy}>Reset to Booked</button>}
      </>}
      {(b.status==="arrived"||b.status==="billed"||b.status==="completed") && <button className="desk-smallbtn desk-accent" onClick={()=>goBilling(b.reference)}> {b.status==="arrived"?"Go to Billing":"View Bill"}</button>}
      {b.status==="completed" && <span className="desk-lock">Finalized — status locked</span>}
    </div>
  </article>)}</div>:<p className="desk-empty">No appointments in this view.</p>;

  return <main className="auren-desk">
    <aside className={`desk-sidebar ${mobileNavOpen ? "is-open" : ""}`} aria-label="Admin navigation">
      <div className="desk-sidebar-brand">
        <img className="desk-brand-logo" src="/auren-favicon.ico" alt="AUREN salon logo" />
        <div><strong>AUREN</strong><small>ADMIN DASHBOARD</small></div>
        <button type="button" className="desk-sidebar-close" aria-label="Close sidebar" onClick={()=>setMobileNavOpen(false)}><FiX/></button>
      </div>
      <span className="desk-sidebar-caption">WORKSPACE</span>
      <nav className="desk-nav" aria-label="Salon management sections">
        {nav.map(({id,label,Icon})=><button type="button" key={id} onClick={()=>selectTab(id)} className={tab===id?"selected":""} aria-current={tab===id?"page":undefined}><Icon/><span>{label}</span></button>)}
      </nav>
      <div className="desk-sidebar-bottom">
        <button type="button" className={`desk-sidebar-setting ${tab==="settings"?"selected":""}`} onClick={()=>selectTab("settings")}><FiSettings/><span>Settings</span></button>
        <div className="desk-sidebar-profile"><span className="desk-profile-avatar"><FiUser/></span><div><strong>{adminName}</strong><small>Salon administrator</small></div></div>
      </div>
    </aside>
    {mobileNavOpen&&<button type="button" className="desk-sidebar-scrim" aria-label="Close navigation" onClick={()=>setMobileNavOpen(false)}/>}
    <div className="desk-workspace">
      <header className="desk-header">
        <div className="desk-heading-group">
          <button type="button" className="desk-mobile-menu desk-iconbtn" aria-label="Open navigation" onClick={()=>setMobileNavOpen(true)}><FiMenu/></button>
          <div className="desk-heading-copy"><span className="desk-eyebrow">AUREN · ADMIN DASHBOARD</span><h1>{tab==="settings"?"Settings":tab==="today"?"Today":nav.find(x=>x.id===tab)?.label || "Today"}</h1><p>{day} · Asia/Kolkata</p></div>
        </div>
        <div className="desk-header-actions">
          <span className="desk-welcome"><small>WELCOME BACK</small><strong>{adminName}</strong></span>
          <div className="desk-bell-wrap"><button type="button" className="desk-iconbtn" onClick={()=>setBellOpen(v=>!v)} aria-label={`Notifications ${unread} unread`} aria-expanded={bellOpen}><FiBell/>{unread>0&&<span className="desk-count">{unread}</span>}</button>
          {bellOpen&&<div className="desk-bell"><div className="desk-bell-top"><strong>Booking alerts</strong><button onClick={()=>setNotices(old=>old.map(x=>({...x,read:true})))}>Mark all read</button></div>{notices.length===0?<p className="desk-empty">No new alerts</p>:notices.map(n=><button className="desk-notice" key={n.id} onClick={()=>{setNotices(old=>old.map(x=>x.id===n.id?{...x,read:true}:x));setTab("today");setTodayTab("appointments");setBellOpen(false);}}>{n.read?"":"● "}{n.name} · {n.time}<small>{n.id}</small></button>)}</div>}</div>
          <button type="button" className="desk-smallbtn desk-refresh-button" onClick={()=>refresh()}><FiRefreshCw/><span>Refresh</span></button>
        </div>
      </header>
      <div className="desk-stats"><div><span>Total Bookings</span><strong>{stats?.total_bookings??"—"}</strong></div><div><span>Total Walk-ins</span><strong>{stats?.total_walkins??"—"}</strong></div><div><span>Today's Appointments</span><strong>{stats?.today_appointments??"—"}</strong></div><div><span>Invoiced Revenue</span><strong>{stats?money(stats.total_revenue):"—"}</strong></div></div>
    {loading&&<p className="desk-empty">Loading salon records…</p>}
    {error&&<p className="desk-error" role="alert">{error}</p>}
    {tab==="today"&&<section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">RECEPTION / TODAY</span><h2>Today's Customer Desk</h2></div><span className="desk-muted">Manage attendance and walk-in customers</span></div>
      <div className="desk-subnav"><button onClick={()=>setTodayTab("appointments")} className={todayTab==="appointments"?"selected":""}>Appointments ({todayBookings.length})</button><button onClick={()=>setTodayTab("walkins")} className={todayTab==="walkins"?"selected":""}>Walk-ins ({todayWalkins.length})</button></div>
      {todayTab==="appointments"&&<><div className="desk-search"><FiSearch/><input name="today_appointment_search" placeholder="Search Booking ID, customer name, phone or email" value={search} onChange={e=>setSearch(e.target.value)}/></div>{appointmentCards(todayBookings.filter(b=>matches(b,search)))}</>}
      {todayTab==="walkins"&&<div className="desk-walkgrid"><form className="desk-inner" onSubmit={registerWalkin}><h3><FiUserPlus/> New Walk-in</h3><label>Customer name<input name="walkin_customer_name" id="walkin_customer_name" autoComplete="name" value={walkName} onChange={e=>setWalkName(e.target.value)} maxLength={80} required placeholder="Customer name"/></label><label>Phone number<input name="walkin_customer_phone" id="walkin_customer_phone" autoComplete="tel" value={walkPhone} onChange={e=>setWalkPhone(e.target.value)} required placeholder="Phone" type="tel"/></label><p className="desk-small">SELECT SERVICES</p><div className="desk-checks">{SERVICES.map(([id,name,price])=><label key={id}><span><input name="walkin_services" type="checkbox" checked={walkServices.includes(id)} onChange={()=>setWalkServices(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}/>{name}</span><strong>{money(price)}</strong></label>)}</div><ServiceLines ids={walkServices} total={walkServices.reduce((n,id)=>n+(SERVICE_LOOKUP[id]?.price||0),0)}/><button className="desk-primary" disabled={!walkServices.length||!!busy}>{busy==="walkin"?"REGISTERING…":"REGISTER WALK-IN"}</button>{registered&&<div className="desk-success">Registered: <strong>{registered.customer_id}</strong><button type="button" className="desk-smallbtn" onClick={()=>goBilling(registered.customer_id)}>Generate Bill →</button></div>}</form>
      <div className="desk-inner"><h3>Today's Walk-ins</h3><div className="desk-search"><FiSearch/><input name="today_walkin_search" placeholder="Search ID, name or number" value={search} onChange={e=>setSearch(e.target.value)}/></div>{todayWalkins.filter(w=>matches(w,search)).map(w=><div className="desk-walkitem" key={w.customer_id}><div className="desk-record-head"><div><strong>{w.name}</strong><small>{w.customer_id} · {w.phone}</small></div><Pill status={w.status}/></div><ServiceLines ids={w.service_ids} total={w.total_price}/><button className="desk-smallbtn desk-accent" onClick={()=>goBilling(w.customer_id)}> {w.status==="completed"?"View Bill":"Generate / View Bill"}</button></div>)}{!todayWalkins.length&&<p className="desk-empty">No walk-ins registered today.</p>}</div></div>}
    </section>}
    {tab==="upcoming"&&<section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">SCHEDULE</span><h2>Upcoming Appointments</h2></div><span className="desk-muted">Today from current time onwards + future days</span></div><div className="desk-search"><FiSearch/><input name="upcoming_search" placeholder="Search Booking ID, name, phone, email" value={search} onChange={e=>setSearch(e.target.value)}/></div>{appointmentCards(futureBookings.filter(b=>matches(b,search)))}</section>}
    {tab==="log"&&<section className="desk-panel desk-today-log">
      <div className="desk-panel-heading"><div><span className="desk-eyebrow">DAILY ACTIVITY · {day}</span><h2>Today Log</h2><p className="desk-muted">A complete view of today's reception activity.</p></div><span className="desk-muted">Times in Asia/Kolkata</span></div>
      <div className="desk-log-summary">
        <div><span>Appointments</span><strong>{(log?.appointments||[]).length}</strong></div>
        <div><span>Walk-ins</span><strong>{(log?.walkins||[]).length}</strong></div>
        <div><span>Invoices</span><strong>{(log?.invoices||[]).length}</strong></div>
        <div><span>Updates</span><strong>{(log?.events||[]).length}</strong></div>
      </div>
      <div className="desk-search"><FiSearch/><input id="today_log_search" name="today_log_search" placeholder="Find booking, walk-in, invoice ID or customer" value={logSearch} onChange={e=>setLogSearch(e.target.value)}/></div>
      <div className="desk-log-columns">
        <section className="desk-log-section"><div className="desk-log-heading"><FiCalendar/><h3>Appointments</h3><span>{(log?.appointments||[]).length}</span></div>
          {(log?.appointments||[]).filter(x=>!logSearch||[x.reference,x.customer_name].some(v=>norm(v).includes(norm(logSearch)))).map(x=><article className="desk-log-row" key={x.reference}><div><strong>{x.customer_name}</strong><span>{x.reference}</span></div><div className="desk-log-row-end"><time>{`${String(Math.floor(x.start_min/60)).padStart(2,"0")}:${String(x.start_min%60).padStart(2,"0")}`}</time><Pill status={x.status}/></div></article>)}
          {!(log?.appointments||[]).some(x=>!logSearch||[x.reference,x.customer_name].some(v=>norm(v).includes(norm(logSearch))))&&<p className="desk-empty">No matching appointments.</p>}
        </section>
        <section className="desk-log-section"><div className="desk-log-heading"><FiUserPlus/><h3>Walk-ins</h3><span>{(log?.walkins||[]).length}</span></div>
          {(log?.walkins||[]).filter(x=>!logSearch||[x.customer_id,x.customer_name].some(v=>norm(v).includes(norm(logSearch)))).map(x=><article className="desk-log-row" key={x.customer_id}><div><strong>{x.customer_name}</strong><span>{x.customer_id}</span></div><div className="desk-log-row-end"><time>{dateTime(x.created_at)}</time><Pill status={x.status}/></div></article>)}
          {!(log?.walkins||[]).some(x=>!logSearch||[x.customer_id,x.customer_name].some(v=>norm(v).includes(norm(logSearch))))&&<p className="desk-empty">No matching walk-ins.</p>}
        </section>
        <section className="desk-log-section"><div className="desk-log-heading"><FiFileText/><h3>Payments & Invoices</h3><span>{(log?.invoices||[]).length}</span></div>
          {(log?.invoices||[]).filter(x=>!logSearch||[x.source_id,x.invoice_id,x.customer_name].some(v=>norm(v).includes(norm(logSearch)))).map(x=><article className="desk-log-row" key={x.invoice_id}><div><strong>{x.customer_name}</strong><span>{x.invoice_id} · {x.source_id}</span><small>{(x.payment_method||"—").toUpperCase()} · {dateTime(x.created_at)}</small></div><div className="desk-log-row-end"><strong className="desk-log-amount">{money(x.total_price)}</strong><span className="desk-log-note">{x.printed_at?"Completed / Printed":"Billed"}</span></div></article>)}
          {!(log?.invoices||[]).some(x=>!logSearch||[x.source_id,x.invoice_id,x.customer_name].some(v=>norm(v).includes(norm(logSearch))))&&<p className="desk-empty">No matching invoices.</p>}
        </section>
        <section className="desk-log-section"><div className="desk-log-heading"><FiClipboard/><h3>Attendance & Activity</h3><span>{(log?.events||[]).length}</span></div>
          {(log?.events||[]).filter(x=>!logSearch||[x.source_id,x.details].some(v=>norm(v).includes(norm(logSearch)))).map((x,i)=><article className="desk-log-row" key={`${x.source_id}-${x.created_at}-${i}`}><div><strong>{displayStatus(x.event_type)}</strong><span>{x.source_id}</span><small>{x.details}</small></div><time>{dateTime(x.created_at)}</time></article>)}
          {!(log?.events||[]).some(x=>!logSearch||[x.source_id,x.details].some(v=>norm(v).includes(norm(logSearch))))&&<p className="desk-empty">No matching activity.</p>}
        </section>
      </div>
    </section>}
    {tab==="billing"&&<section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">PAYMENTS / INVOICE</span><h2>Customer Billing</h2></div><span className="desk-muted">Search booking or walk-in ID, name or phone</span></div><form className="desk-billform" onSubmit={generateInvoice}><label>Booking / Walk-in reference<input name="billing_customer_reference" id="billing_customer_reference" autoComplete="off" value={billingId} onChange={e=>{setBillingId(e.target.value);setBillingShowSuggestions(true);setSelectedInvoice(null);}} placeholder="Start typing ID or customer name" required/></label>{billingShowSuggestions&&billingId.trim()&&<div className="desk-suggestions">{billingMatches.length?billingMatches.map(c=><button type="button" key={c.source_id} onClick={()=>{setBillingId(c.source_id);setBillingShowSuggestions(false);setSelectedInvoice(invoices.find(x=>x.source_id===c.source_id)||null);}}><strong>{c.name} · {c.source_id}</strong><span>{c.phone} · {money(c.total_price)} · {c.already_billed?"Already Billed":displayStatus(c.status)}</span></button>):<p className="desk-muted">No matching customers</p>}</div>}{lookupCustomer&&<div className="desk-inner"><strong>{lookupCustomer.name} — {lookupCustomer.id}</strong><ServiceLines ids={lookupCustomer.service_ids} total={lookupCustomer.total_price}/><Pill status={lookupCustomer.status}/></div>}<fieldset className="desk-payment-panel"><legend>Payment method <span className="desk-payment-required">· Required</span></legend><p className="desk-payment-hint">Choose how the customer paid. No method is selected by default.</p><div className="desk-methods">{[["cash","Cash"],["upi","UPI"],["card","Card"]].map(([value,label])=><label key={value} className={billingMethod===value?"is-selected":""}><input name="payment_method" type="radio" value={value} checked={billingMethod===value} onChange={()=>setBillingMethod(value)} required/>{label}</label>)}</div></fieldset><button className="desk-primary" disabled={!!busy||!billingId.trim()||!billingMethod}>{busy==="invoice"?"GENERATING…":"GENERATE INVOICE"}</button><p className="desk-muted">Appointments must be marked Arrived before billing. One invoice per ID.</p></form>
    <p className="desk-muted desk-billing-help">Invoice opens in a small receipt preview and the browser Print dialog. Use Recent Invoices to reprint.</p>
    <div className="desk-inner"><h3>Recent Invoices</h3>{invoices.map(inv=><div className="desk-logitem" key={inv.invoice_id}><span className="desk-small">{inv.invoice_id} · {inv.source_id}</span><strong>{inv.name} — {money(inv.total_price)}</strong><span>{inv.payment_method?.toUpperCase()} · {displayStatus(inv.status)}</span><button className="desk-smallbtn" onClick={()=>openInvoice(inv,true)}>View / Print</button></div>)}{!invoices.length&&<p className="desk-empty">No invoices yet.</p>}</div>
    </section>}
    {tab==="revenue"&&<section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-eyebrow">FINANCIAL SUMMARY</span><h2>Revenue</h2></div><span className="desk-muted">Invoice totals (demo)</span></div><div className="desk-stats"><div><span>Total invoiced</span><strong>{stats?money(stats.total_revenue):"—"}</strong></div><div><span>Invoices generated</span><strong>{stats?.total_invoices??"—"}</strong></div><div><span>Walk-in records</span><strong>{stats?.total_walkins??"—"}</strong></div></div><div className="desk-inner desk-revenue-chart"><div className="desk-chart-heading"><h3>Last 7 days</h3><span className="desk-muted">Daily invoiced total · INR</span></div><div className="desk-bars" role="img" aria-label="Last seven days invoiced revenue">{revenueDays.map(d=><div className="desk-bar-group" key={d.key} title={`${d.key}: ${money(d.amount)}`}><span className="desk-bar-value">{d.amount?money(d.amount):"—"}</span><div className="desk-bar-track"><div className="desk-bar-fill" style={{height:`${d.amount?Math.max(6,100*d.amount/revenueMax):0}%`}}/></div><span className="desk-bar-label">{d.label}</span></div>)}</div></div><div className="desk-inner"><h3>Revenue records</h3>{invoices.map(inv=><div key={inv.invoice_id} className="desk-logitem"><span className="desk-small">{inv.invoice_id} · {dateTime(inv.created_at)}</span><strong>{inv.name} — {money(inv.total_price)}</strong><span>{inv.payment_method?.toUpperCase()} · {inv.source_id}</span></div>)}</div><p className="desk-muted">Invoice generation is recorded as invoiced revenue; payment settlement is not externally verified.</p></section>}
    {tab==="settings"&&<section className="desk-panel desk-settings-page">
      <div className="desk-panel-heading"><div><span className="desk-eyebrow">CONTROL CENTER</span><h2>Settings & Administration</h2><p className="desk-muted">Manage your current admin session and salon demo preferences.</p></div><span className="desk-settings-symbol"><FiSettings/></span></div>
      <div className="desk-settings-grid">
        <article className="desk-inner desk-settings-card"><span className="desk-setting-icon"><FiUser/></span><h3>Administrator</h3><p className="desk-muted">Current role: Salon Admin</p><div className="desk-setting-detail"><span>Session</span><strong>Active</strong></div><div className="desk-setting-detail"><span>Access</span><strong>Reception dashboard</strong></div><button type="button" className="desk-smallbtn desk-settings-action" onClick={()=>{navigator.clipboard?.writeText(`${window.location.origin}/admin/login`).then(()=>setToast("Admin login URL copied")).catch(()=>setToast("Open /admin/login to sign in"));}}><FiExternalLink/> Copy admin login link</button></article>
        <article className="desk-inner desk-settings-card"><span className="desk-setting-icon"><FiShield/></span><h3>Admin Management</h3><p className="desk-muted">Existing demo uses one administrator account, configured in Flask environment variables.</p><button type="button" className="desk-smallbtn desk-settings-action" disabled title="Multi-admin accounts require a protected backend endpoint"><FiPlus/> Add another admin</button><p className="desk-setting-hint">Multi-admin creation is not enabled in this single-admin demo. No credentials are stored in the browser.</p></article>
        <article className="desk-inner desk-settings-card"><span className="desk-setting-icon"><FiLogOut/></span><h3>Account & Security</h3><p className="desk-muted">Finish a demonstration securely by signing out. Booking data stays intact.</p><button type="button" className="desk-primary desk-logout-action" onClick={logout}><FiLogOut/> Sign out of admin</button><p className="desk-setting-hint">You'll return to the AUREN admin login screen.</p></article>
      </div>
    </section>}
    {selectedInvoice && <div className="desk-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedInvoice(null);}}>
      <section className="desk-receipt-dialog" role="dialog" aria-modal="true" aria-label="Invoice preview">
        <div className="desk-receipt-toolbar"><div><strong>Invoice preview</strong><p>80 mm thermal receipt · Browser print</p></div><button type="button" className="desk-iconbtn" aria-label="Close invoice" onClick={()=>setSelectedInvoice(null)}><FiX/></button></div>
        <div className="desk-receipt" id="auren-print-invoice">
          <div className="desk-receipt-brand"><h2>AUREN</h2><p>HAIR & BEAUTY ATELIER</p><span>DEMO INVOICE</span></div>
          <div className="desk-receipt-rule"/>
          <dl className="desk-receipt-metadata"><div><dt>Invoice</dt><dd>{selectedInvoice.invoice_id}</dd></div><div><dt>Date</dt><dd>{dateTime(selectedInvoice.created_at)}</dd></div><div><dt>Customer</dt><dd>{selectedInvoice.name}</dd></div><div><dt>Ref</dt><dd>{selectedInvoice.source_id}</dd></div><div><dt>Payment</dt><dd>{selectedInvoice.payment_method?.toUpperCase()}</dd></div></dl>
          <div className="desk-receipt-rule"/><div className="desk-receipt-items"><div className="desk-receipt-items-head"><span>Service</span><span>Amount</span></div>{(selectedInvoice.items||[]).map((item,index)=><div key={`${item.id}-${index}`}><span>{item.name}</span><strong>{money(item.price)}</strong></div>)}</div>
          <div className="desk-receipt-rule"/><div className="desk-receipt-total"><span>TOTAL</span><strong>{money(selectedInvoice.total_price)}</strong></div><div className="desk-receipt-rule"/>
          <p className="desk-receipt-foot">Thank you for visiting AUREN.</p><p className="desk-receipt-foot">Demo invoice · No separate tax applied</p>
        </div>
        <div className="desk-receipt-actions"><button type="button" className="desk-smallbtn" onClick={()=>window.print()}><FiPrinter/> Print / Save PDF</button>{selectedInvoice.status!=="completed"&&<button type="button" className="desk-primary" onClick={completeInvoice} disabled={!!busy}><FiCheck/> Confirm printed / Complete</button>}</div>
        <p className="desk-receipt-note">Use the browser's native Print dialog and choose your 80 mm thermal printer / paper size. Printing alone does not mark this customer completed.</p>
      </section>
    </div>}
    {toast&&<div className="desk-toast" role="status"><span className="desk-toast-icon"><FiBell/></span><span>{toast}</span><button onClick={()=>setToast(null)} aria-label="Dismiss"><FiX/></button></div>}
    </div>
  </main>;
}
