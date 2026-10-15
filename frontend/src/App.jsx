
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
import PrivacyManager from "./components/PrivacyManager/PrivacyManager";
import Tracking from "./pages/Tracking/Tracking";

import "./App.css";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Legal and Booking pages always start at the top.
    if (
      pathname.startsWith("/legal/") ||
      pathname === "/booking"
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

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />

      <Routes>
        <Route
          path="/"
          element={<IntroAnimation />}
        />

        <Route
          path="/home"
          element={<Home />}
        />

        <Route
          path="/booking"
          element={<Booking />}
        />

        <Route
          path="/legal/:slug"
          element={<LegalPage />}
        />

        <Route
          path="/track"
          element={<Booking initialMode="track" />}
        />


      </Routes>

      <PrivacyManager />
    </BrowserRouter>
  );
}

export default App;
