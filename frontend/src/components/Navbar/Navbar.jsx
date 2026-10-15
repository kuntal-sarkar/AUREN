
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";

import "./Navbar.css";
import { Link } from "react-router-dom";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "Our Work", href: "#gallery" },
  { name: "Artists", href: "#artists" },
  { name: "Feedback", href: "#feedback" },
  { name: "Contact", href: "#contact" },
];

function Navbar() {
  const [activeLink, setActiveLink] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState(null);

  const containerRef = useRef(null);
  const linksRef = useRef({});

  const navigatingRef = useRef(false);
  const contactScrollingRef = useRef(false);

  const scrollTimerRef = useRef(null);
  const frameRef = useRef(null);
  const contactFrameRef = useRef(null);

  // -----------------------------------------
  // ORIGINAL LIQUID GLASS INDICATOR
  // -----------------------------------------

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const element = linksRef.current[activeLink];

      if (!element) return;

      setIndicator({
        left: element.offsetLeft,
        top: element.offsetTop,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
    };

    updateIndicator();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateIndicator)
        : null;

    if (containerRef.current) {
      observer?.observe(containerRef.current);
    }

    Object.values(linksRef.current).forEach((element) => {
      if (element) observer?.observe(element);
    });

    window.addEventListener("resize", updateIndicator);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeLink]);

  // -----------------------------------------
  // ORIGINAL ACTIVE SECTION TRACKING
  // -----------------------------------------

  const updateActiveSection = () => {
    if (navigatingRef.current) return;

    const checkpoint = window.scrollY + 145;

    let current = "Home";

    navLinks.forEach((link) => {
      const section = document.getElementById(
        link.href.slice(1)
      );

      if (!section) return;

      const top =
        section.getBoundingClientRect().top +
        window.scrollY;

      if (checkpoint >= top) {
        current = link.name;
      }
    });

    setActiveLink((previous) =>
      previous === current ? previous : current
    );
  };

  const clearNavigationTimer = () => {
    if (scrollTimerRef.current !== null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
  };

  const stopContactAnimation = () => {
    if (contactFrameRef.current !== null) {
      cancelAnimationFrame(contactFrameRef.current);
      contactFrameRef.current = null;
    }

    contactScrollingRef.current = false;
  };

  const finishNavigation = () => {
    clearNavigationTimer();

    if (contactScrollingRef.current) {
      return;
    }

    navigatingRef.current = false;
    updateActiveSection();
  };

  // -----------------------------------------
  // ORIGINAL SCROLL TRACKING
  // -----------------------------------------

  useEffect(() => {
    const onScroll = () => {
      if (navigatingRef.current) return;
      if (frameRef.current !== null) return;

      frameRef.current = requestAnimationFrame(() => {
        updateActiveSection();
        frameRef.current = null;
      });
    };

    const onManualScroll = () => {
      if (!navigatingRef.current) return;

      if (contactScrollingRef.current) {
        stopContactAnimation();
      }

      finishNavigation();
    };

    const onScrollEnd = () => {
      // Don't interrupt the Contact animation.
      if (contactScrollingRef.current) return;

      finishNavigation();
    };

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    window.addEventListener("resize", onScroll);

    window.addEventListener("scrollend", onScrollEnd);

    window.addEventListener("wheel", onManualScroll, {
      passive: true,
    });

    window.addEventListener("touchstart", onManualScroll, {
      passive: true,
    });

    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", onManualScroll);
      window.removeEventListener(
        "touchstart",
        onManualScroll
      );

      clearNavigationTimer();
      stopContactAnimation();

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  // -----------------------------------------
  // CONTACT — CONTROLLED SMOOTH SCROLL
  // -----------------------------------------

  const smoothScrollToContact = (section) => {
    stopContactAnimation();

    const heading =
      section.querySelector(".auren-contact-header") ||
      section;

    const startY = window.scrollY;
    const duration = 1050;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const getTarget = () => {
      const headingY =
        heading.getBoundingClientRect().top +
        window.scrollY;

      const offset =
        window.innerWidth <= 600 ? 100 : 125;

      const maximumScroll = Math.max(
        0,
        document.documentElement.scrollHeight -
        window.innerHeight
      );

      return Math.min(
        Math.max(0, headingY - offset),
        maximumScroll
      );
    };

    if (reducedMotion) {
      window.scrollTo({
        top: getTarget(),
        behavior: "instant",
      });

      navigatingRef.current = false;
      updateActiveSection();
      return;
    }

    navigatingRef.current = true;
    contactScrollingRef.current = true;

    let startTime = null;

    const animate = (time) => {
      if (!contactScrollingRef.current) return;

      if (startTime === null) {
        startTime = time;
      }

      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      // Smooth ease-in-out, no abrupt jump
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Recalculate destination if page layout shifts
      const destination = getTarget();

      const nextY =
        startY + (destination - startY) * eased;

      window.scrollTo({
        top: nextY,
        behavior: "instant",
      });

      if (progress < 1) {
        contactFrameRef.current =
          requestAnimationFrame(animate);
      } else {
        window.scrollTo({
          top: getTarget(),
          behavior: "instant",
        });

        stopContactAnimation();
        navigatingRef.current = false;
        setActiveLink("Contact");
      }
    };

    contactFrameRef.current =
      requestAnimationFrame(animate);
  };

  // -----------------------------------------
  // NAVBAR CLICK NAVIGATION
  // -----------------------------------------

  const scrollToSection = (event, link) => {
    event.preventDefault();

    const section = document.getElementById(
      link.href.slice(1)
    );

    setMenuOpen(false);

    if (!section) return;

    clearNavigationTimer();
    stopContactAnimation();

    navigatingRef.current = true;
    setActiveLink(link.name);

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${link.href}`
    );

    // Only Contact uses the special smooth animation
    if (link.name === "Contact") {
      smoothScrollToContact(section);
      return;
    }

    // ORIGINAL scrolling for all other sections
    const targetY =
      section.getBoundingClientRect().top +
      window.scrollY;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: reducedMotion ? "instant" : "smooth",
    });

    if (reducedMotion) {
      finishNavigation();
      return;
    }

    scrollTimerRef.current = setTimeout(() => {
      finishNavigation();
    }, 1600);
  };

  // -----------------------------------------
  // ORIGINAL BOOKING BEHAVIOUR
  // -----------------------------------------

  const handleBooking = (event) => {
    const booking = document.getElementById("booking");

    if (!booking) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    booking.scrollIntoView({
      behavior: window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };

  return (
    <header className="auren-navbar-wrapper">
      <nav
        className="auren-navbar"
        aria-label="Main navigation"
      >
        <a
          href="#home"
          className="auren-navbar-logo"
          onClick={(event) =>
            scrollToSection(event, navLinks[0])
          }
        >
          AUREN<span className="auren-logo-dot">.</span>
        </a>

        <div
          className={`auren-nav-links ${menuOpen ? "auren-nav-links-open" : ""
            }`}
          id="auren-navigation"
          ref={containerRef}
        >
          {indicator && (
            <span
              className="auren-nav-indicator"
              style={{
                left: indicator.left,
                top: indicator.top,
                width: indicator.width,
                height: indicator.height,
              }}
              aria-hidden="true"
            />
          )}

          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              ref={(element) => {
                linksRef.current[link.name] = element;
              }}
              className={`auren-nav-link ${activeLink === link.name
                  ? "auren-nav-link-active"
                  : ""
                }`}
              onClick={(event) =>
                scrollToSection(event, link)
              }
              aria-current={
                activeLink === link.name
                  ? "location"
                  : undefined
              }
            >
              <span>{link.name}</span>
            </a>
          ))}
        </div>

        <button
          type="button"
          className={`auren-menu-toggle ${menuOpen ? "auren-menu-toggle-open" : ""
            }`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="auren-navigation"
        >
          <span />
          <span />
        </button>
      </nav>

      <Link
        to="/booking"
        className="auren-navbar-book"
      >
        <span className="auren-book-dot" />
        <span>Book Now</span>
        <span className="auren-book-arrow" aria-hidden="true">
          ↗
        </span>
      </Link>
    </header>
  );
}

export default Navbar;
