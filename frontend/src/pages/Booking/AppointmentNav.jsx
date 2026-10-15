import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./BookingTabs.css";

export default function AppointmentNav({ mode, onModeChange }) {
  const tabsRef = useRef(null);
  const buttonRefs = useRef({});
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    const update = () => {
      const container = tabsRef.current;
      const active = buttonRefs.current[mode];
      if (!container || !active) return;
      // offsetLeft is relative to the positioned tabs container.
      setPill({ left: active.offsetLeft, top: active.offsetTop,
        width: active.offsetWidth, height: active.offsetHeight });
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (tabsRef.current) observer?.observe(tabsRef.current);
    Object.values(buttonRefs.current).forEach((node) => node && observer?.observe(node));
    window.addEventListener("resize", update);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); };
  }, [mode]);

  return (
    <header className="auren-booking-nav auren-appointment-nav">
      <Link to="/home" className="auren-booking-logo" aria-label="AUREN home">
        AUREN<span>.</span>
      </Link>

      <nav className="auren-appointment-tabs" ref={tabsRef} aria-label="Appointment navigation">
        {pill && (
          <span className="auren-appointment-indicator" aria-hidden="true"
            style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }} />
        )}
        <button type="button" ref={(node) => { buttonRefs.current.book = node; }}
          className={`auren-appointment-tab ${mode === "book" ? "is-active" : ""}`}
          aria-pressed={mode === "book"} onClick={() => onModeChange("book")}>BOOK APPOINTMENT</button>
        <button type="button" ref={(node) => { buttonRefs.current.track = node; }}
          className={`auren-appointment-tab ${mode === "track" ? "is-active" : ""}`}
          aria-pressed={mode === "track"} onClick={() => onModeChange("track")}>TRACK APPOINTMENT</button>
      </nav>

      <Link to="/home" className="auren-appointment-home">
        <span className="auren-appointment-back-arrow" aria-hidden="true">←</span>
        <span>BACK TO ATELIER</span>
      </Link>
    </header>
  );
}
