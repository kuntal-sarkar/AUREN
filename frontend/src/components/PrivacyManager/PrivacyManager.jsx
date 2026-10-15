import { useEffect, useRef, useState } from "react";
import "./PrivacyManager.css";

export const CONSENT_KEY = "auren_cookie_preferences_v1";
const defaults = { essential: true, functional: false, analytics: false, marketing: false };
export function readConsent() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    if (!stored || typeof stored !== "object") return null;
    return { essential: true, functional: stored.functional === true,
      analytics: stored.analytics === true, marketing: stored.marketing === true };
  } catch { return null; }
}
export function saveConsent(value) {
  const data = { essential: true, functional: !!value.functional, analytics: !!value.analytics, marketing: !!value.marketing };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(data)); } catch { /* browser may restrict storage */ }
  window.dispatchEvent(new CustomEvent("auren:consent-change", { detail: data }));
  return data;
}
const types = [
  { key: "essential", name: "Essential", detail: "Needed for preferences and basic website operation. Always on." },
  { key: "functional", name: "Functional / Maps", detail: "Allow third-party interactive Google Maps to load." },
  { key: "analytics", name: "Analytics", detail: "For future optional traffic measurement. No analytics SDK currently installed." },
  { key: "marketing", name: "Marketing", detail: "For future optional advertising tools. No advertising SDK currently installed." },
];

export default function CookieConsent() {
  const [consent, setConsent] = useState(() => readConsent());
  const [showPreferences, setShowPreferences] = useState(false);
  const [draft, setDraft] = useState(() => readConsent() || defaults);
  const dialogRef = useRef(null);
  const buttonRef = useRef(null);
  useEffect(() => {
    const open = () => { setDraft(readConsent() || defaults); setShowPreferences(true); };
    const sync = () => setConsent(readConsent());
    window.addEventListener("auren:open-cookie-preferences", open);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("auren:open-cookie-preferences", open); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    if (!showPreferences) return;
    const prior = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buttonRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { setShowPreferences(false); return; }
      if (e.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled])');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener("keydown", onKey); prior?.focus?.(); };
  }, [showPreferences]);
  const commit = (value) => { setConsent(saveConsent(value)); setShowPreferences(false); };
  return <>
    {!consent && !showPreferences && <aside className="auren-cookie-banner" aria-label="Cookie choices">
      <div><span className="auren-cookie-eyebrow">PRIVACY FIRST</span><h2>Your privacy, your choice.</h2>
        <p>Essential storage supports this demo. With your permission we can load Google Maps. Analytics and marketing tools are not installed. Change your choices anytime in the footer.</p></div>
      <div className="auren-cookie-actions">
        <button onClick={() => commit({ essential:true,functional:true,analytics:true,marketing:true })}>Accept All</button>
        <button onClick={() => commit(defaults)}>Reject Optional</button>
        <button onClick={() => { setDraft(defaults); setShowPreferences(true); }}>Customize</button>
      </div>
    </aside>}
    {showPreferences && <div className="auren-cookie-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) setShowPreferences(false); }}>
      <section className="auren-cookie-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auren-cookie-title">
        <button className="auren-cookie-close" ref={buttonRef} onClick={() => setShowPreferences(false)} aria-label="Close preferences">×</button>
        <span className="auren-cookie-eyebrow">AUREN PRIVACY SETTINGS</span><h2 id="auren-cookie-title">Cookie preferences.</h2>
        <p>Choose optional technologies. Your selections stay on this browser and can be updated later.</p>
        {types.map(t => <label className="auren-cookie-toggle" key={t.key}>
          <span><strong>{t.name}</strong><small>{t.detail}</small></span>
          <input type="checkbox" checked={!!draft[t.key]} disabled={t.key === "essential"} onChange={e => setDraft(v => ({...v,[t.key]: e.target.checked}))} />
        </label>)}
        <div className="auren-cookie-modal-actions"><button onClick={() => commit(defaults)}>Reject Optional</button><button onClick={() => commit(draft)}>Save My Choices</button></div>
      </section>
    </div>}
  </>;
}
