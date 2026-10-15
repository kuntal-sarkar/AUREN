
import { Link, useLocation } from "react-router-dom";
import { FaInstagram, FaWhatsapp } from "react-icons/fa6";
import "./Footer.css";

const explore = [
  ["Home", "home"],
  ["Services", "services"],
  ["Our Artists", "artists"],
  ["Gallery", "gallery"],
  ["Feedback", "feedback"],
  ["Contact", "contact"],
];

const support = [
  ["FAQs", "/legal/faq"],
  ["Cancellation & Refunds", "/legal/cancellation"],
  ["Accessibility", "/legal/accessibility"],
];

const legal = [
  ["Terms & Conditions", "/legal/terms"],
  ["Privacy Policy", "/legal/privacy"],
  ["Cookie Policy", "/legal/cookies"],
  ["Third-Party Services", "/legal/third-party"],
];

const privacy = [
  ["Data We Collect", "/legal/data"],
  ["Your Privacy Rights", "/legal/rights"],
];

function Footer() {
  const { pathname } = useLocation();
  const onHome = pathname === "/home";

  const openCookies = () => {
    window.dispatchEvent(
      new Event("auren:open-cookie-preferences")
    );
  };

  // Footer navigation only.
  // Does not modify the existing Navbar scrolling.
  const handleSectionClick = (event, id) => {
    if (!onHome) return;

    const section = document.getElementById(id);
    if (!section) return;

    event.preventDefault();

    const offset = window.innerWidth <= 600 ? 80 : 100;

    const position =
      id === "home"
        ? 0
        : section.getBoundingClientRect().top +
          window.scrollY -
          offset;

    window.history.replaceState(
      null,
      "",
      `/home#${id}`
    );

    window.scrollTo({
      top: Math.max(0, position),
      behavior: window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <footer className="auren-footer">
      <div className="auren-footer-container">

        {/* FOOTER HEADING */}

        <div className="auren-footer-head">
          <div>
            <span className="auren-footer-eyebrow">
              THE ART OF BEING YOU
            </span>

            <h2>
              Beauty is <em>personal.</em>
            </h2>

            <p>
              A space to discover, express and celebrate
              your individuality.
            </p>
          </div>

          <div className="auren-footer-socials">
            <a
              href="https://www.instagram.com/kuntal.exe.x"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram aria-hidden="true" />
              Instagram
            </a>

            <a
              href="https://wa.me/916295243331"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>

        {/* FOOTER LINK COLUMNS */}

        <nav
          className="auren-footer-columns"
          aria-label="Footer links"
        >
          {/* EXPLORE */}

          <div className="auren-footer-column">
            <h3>EXPLORE</h3>

            {explore.map(([label, id]) => (
              <Link
                key={id}
                to={`/home#${id}`}
                onClick={(event) =>
                  handleSectionClick(event, id)
                }
              >
                {label}
              </Link>
            ))}

            <Link
              to="/home#services"
              onClick={(event) =>
                handleSectionClick(event, "services")
              }
            >
              Explore Services & Booking
            </Link>
          </div>

          {/* SUPPORT */}

          <div className="auren-footer-column">
            <h3>SUPPORT</h3>

            <Link
              to="/home#enquiry"
              onClick={(event) =>
                handleSectionClick(event, "enquiry")
              }
            >
              Contact Us
            </Link>

            {support.map(([label, href]) => (
              <Link key={href} to={href}>
                {label}
              </Link>
            
            ))}
            <Link to="/track">Track Your Appointment</Link>
          </div>

          {/* LEGAL */}

          <div className="auren-footer-column">
            <h3>LEGAL</h3>

            {legal.map(([label, href]) => (
              <Link key={href} to={href}>
                {label}
              </Link>
            ))}
          </div>

          {/* PRIVACY */}

          <div className="auren-footer-column">
            <h3>YOUR PRIVACY</h3>

            <button
              type="button"
              onClick={openCookies}
            >
              Cookie Preferences
            </button>

            {privacy.map(([label, href]) => (
              <Link key={href} to={href}>
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {/* BRAND */}

        <div className="auren-footer-brand">
          AUREN<span>.</span>
        </div>

        {/* BOTTOM BAR */}

        <div className="auren-footer-bottom">
          <span>
            © {new Date().getFullYear()} AUREN.
            ALL RIGHTS RESERVED.
          </span>

          <span>HAIR & BEAUTY ATELIER</span>

          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            BACK TO TOP ↑
          </button>
        </div>

        {/* CREDITS */}

        <div className="auren-footer-credits">
          <span>DESIGNED & DEVELOPED BY</span>

          <p>
            <a
              href="https://www.instagram.com/kuntal.exe.x"
              target="_blank"
              rel="noopener noreferrer"
            >
              kuntal.exe.x
            </a>

            <span>/</span>

            TEAM RUNTIME ERROR
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
