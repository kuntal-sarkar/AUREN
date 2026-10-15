import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export default function HashScroller() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo({top:0,behavior:"instant"}); return; }
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView({behavior:"smooth",block:"start"}));
  }, [pathname,hash]);
  return null;
}
