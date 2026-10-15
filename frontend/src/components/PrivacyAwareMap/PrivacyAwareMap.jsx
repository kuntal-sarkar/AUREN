import { useEffect, useState } from "react";
import { readConsent } from "../CookieConsent/CookieConsent";
export default function PrivacyAwareMap({ src, title = "Google Maps" }) {
  const [allow, setAllow] = useState(() => readConsent()?.functional === true);
  useEffect(() => {
    const update = () => setAllow(readConsent()?.functional === true);
    window.addEventListener("auren:consent-change", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("auren:consent-change", update); window.removeEventListener("storage", update); };
  }, []);
  if (allow) return <iframe src={src} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />;
  return <div style={{minHeight:350,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:24,color:"#e6e7eb",gap:14}}>
    <strong style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:400}}>Explore our demo location.</strong>
    <p style={{fontSize:12,color:"#b5b8c1",maxWidth:290,lineHeight:1.7}}>Google Maps loads only with your permission. The map shows Park Street, Kolkata — not an AUREN salon address.</p>
    <button type="button" style={{padding:"13px 21px",borderRadius:28,border:"1px solid #ccc",background:"#e8e9eb",color:"#141517",cursor:"pointer"}} onClick={() => window.dispatchEvent(new Event("auren:open-cookie-preferences"))}>Map Privacy Settings ↗</button>
  </div>;
}
