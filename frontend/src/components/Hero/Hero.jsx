
import { Link } from "react-router-dom";
import "./Hero.css";

function Hero() {
  // Smooth scroll to Services without hiding
  // its heading behind the floating Navbar.
  const handleExploreServices = (event) => {
    event.preventDefault();

    const section = document.getElementById("services");

    if (!section) return;

    const navbarOffset =
      window.innerWidth <= 600 ? 80 : 100;

    const targetY =
      section.getBoundingClientRect().top +
      window.scrollY -
      navbarOffset;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#services`
    );

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: reducedMotion ? "instant" : "smooth",
    });
  };

  return (
    <section className="auren-hero" id="home">

      {/* FULL SCREEN BACKGROUND */}

      <div
        className="auren-hero-background"
        aria-hidden="true"
      >
        <img
          src="/images/auren-hero.jpg"
          alt=""
          className="auren-hero-image"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {/* CINEMATIC GRADIENT */}

      <div
        className="auren-hero-overlay"
        aria-hidden="true"
      />

      {/* LEFT CONTENT */}

      <div className="auren-hero-content">

        <div className="auren-hero-eyebrow">
          <span className="auren-hero-line" />
          HAIR · BEAUTY · ATELIER
        </div>

        <h1 className="auren-hero-title">
          Where style
          <br />
          becomes
          <br />
          <em>statement.</em>
        </h1>

        <p className="auren-hero-description">
          Discover extraordinary hair, refined grooming,
          timeless beauty and luxurious self-care.
          An experience crafted entirely around you.
        </p>

        {/* FIXED ACTION BUTTONS */}

        <div className="auren-hero-actions">

          {/* Opens booking form directly */}

          <Link
            to="/booking"
            className="auren-hero-primary"
          >
            BOOK AN APPOINTMENT
            <span aria-hidden="true">↗</span>
          </Link>

          {/* Smooth scroll to Services */}

          <a
            href="#services"
            className="auren-hero-secondary"
            onClick={handleExploreServices}
          >
            EXPLORE SERVICES
            <span aria-hidden="true">→</span>
          </a>

        </div>

        {/* EDITORIAL BOTTOM DETAIL */}

        <div className="auren-hero-bottom">

          <div className="auren-hero-stat">
            <span className="auren-hero-stat-title">
              THE ART
            </span>

            <span className="auren-hero-stat-label">
              OF PERSONAL EXPRESSION
            </span>
          </div>

          <span className="auren-hero-stat-divider" />

          <div className="auren-hero-stat">
            <span className="auren-hero-stat-title">
              AUREN
            </span>

            <span className="auren-hero-stat-label">
              YOUR STYLE. OUR ART.
            </span>
          </div>

        </div>
      </div>

      <div className="auren-hero-edge-label">
        PRECISION IN EVERY DETAIL
      </div>

    </section>
  );
}

export default Hero;
