
import {
  useLayoutEffect,
  useRef,
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import IntroAnimation from "./components/IntroAnimation/IntroAnimation";
import Home from "./pages/Home/Home";
import LegalPage from "./pages/Legal/LegalPage";
import Booking from "./pages/Booking/Booking";
import Tracking from "./pages/Tracking/Tracking";
import AdminLogin from "./pages/Admin/AdminLogin";
import PrivacyManager from "./components/PrivacyManager/PrivacyManager";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminWalkins from "./pages/Admin/AdminWalkins";


import "./App.css";

// Handles page scrolling when routes change.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Booking and legal pages should always start at the top.
    if (
      pathname.startsWith("/legal/") ||
      pathname === "/booking" ||
      pathname === "/track" ||
      pathname === "/tracking" ||
      pathname.startsWith("/admin")
    ) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }

    const isInitialLoad = firstRender.current;
    firstRender.current = false;

    const frame = requestAnimationFrame(() => {
      const isReload =
        performance.getEntriesByType("navigation")[0]
          ?.type === "reload";

      if (
        pathname === "/home" &&
        hash &&
        !(isInitialLoad && isReload)
      ) {
        const id = decodeURIComponent(hash.slice(1));
        const target = document.getElementById(id);

        if (target) {
          const offset =
            window.innerWidth <= 600 ? 80 : 100;

          const position =
            id === "home"
              ? 0
              : target.getBoundingClientRect().top +
                window.scrollY -
                offset;

          window.scrollTo({
            top: Math.max(0, position),
            behavior: window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches
              ? "instant"
              : "smooth",
          });
        }

        return;
      }

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

// Customer privacy controls are not shown on admin pages.
function CustomerPrivacyManager() {
  const { pathname } = useLocation();

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return null;
  }

  return <PrivacyManager />;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />

      <Routes>
        {/* Intro animation */}
        <Route
          path="/"
          element={<IntroAnimation />}
        />

        {/* Main customer website */}
        <Route
          path="/home"
          element={<Home />}
        />

        {/* Appointment booking */}
        <Route
          path="/booking"
          element={<Booking />}
        />

        {/* Legal pages */}
        <Route
          path="/legal/:slug"
          element={<LegalPage />}
        />

        {/* Booking tracking panel */}
        <Route
          path="/track"
          element={<Booking initialMode="track" />}
        />

        {/* Standalone tracking page */}
        <Route
          path="/tracking"
          element={<Tracking />}
        />

        {/* Admin login */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />
        {/* Admin dashboard */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
        {/* Admin walk-ins */}
        <Route
          path="/admin/walkins"
          element={<AdminWalkins />}
        />
      </Routes>

      <CustomerPrivacyManager />
    </BrowserRouter>
  );
}

export default App;
