
import { useEffect, useRef, useState } from "react";
import "./Feedback.css";

const STORAGE_KEY = "auren_demo_reviews";

const demoReviews = [
  {
    id: "demo-1",
    name: "Client Experience 01",
    service: "Hair Transformation",
    rating: 5,
    quote:
      "The consultation was thoughtful, the styling was precise, and every detail felt beautifully considered.",
    source: "demo",
  },
  {
    id: "demo-2",
    name: "Client Experience 02",
    service: "Premium Grooming",
    rating: 5,
    quote:
      "From the atmosphere to the finishing touches, the entire grooming experience felt effortless and refined.",
    source: "demo",
  },
  {
    id: "demo-3",
    name: "Client Experience 03",
    service: "Makeup & Beauty",
    rating: 4,
    quote:
      "A calm, luxurious experience with attention to every detail. Exactly the kind of care you hope for.",
    source: "demo",
  },
  {
    id: "demo-4",
    name: "Client Experience 04",
    service: "Nail Atelier",
    rating: 5,
    quote:
      "Beautifully executed work, a relaxing environment, and a finish that felt truly personal.",
    source: "demo",
  },
];

const services = [
  "Hair Styling",
  "Hair Colour",
  "Grooming",
  "Makeup",
  "Nails",
  "Skin & Facial",
  "Spa & Wellness",
  "Other",
];

function loadLocalReviews() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved)
      ? saved.filter(
          (item) =>
            item &&
            typeof item.name === "string" &&
            typeof item.quote === "string" &&
            Number.isInteger(item.rating) &&
            item.rating >= 1 &&
            item.rating <= 5
        )
      : [];
  } catch {
    return [];
  }
}

function Stars({ rating, interactive = false, onChange }) {
  return (
    <div
      className={`auren-rating ${
        interactive ? "auren-rating-interactive" : ""
      }`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            className={star <= rating ? "filled" : ""}
            onClick={() => onChange(star)}
            aria-label={`Give ${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={rating === star}
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            className={star <= rating ? "filled" : ""}
            aria-hidden="true"
          >
            ★
          </span>
        )
      )}
    </div>
  );
}

function ServiceDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectService = (item) => {
    onChange(item);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="auren-service-field">
      <span className="auren-service-label">
        SERVICE EXPERIENCED
      </span>

      <div
        className={`auren-service-dropdown ${
          open ? "is-open" : ""
        }`}
        ref={wrapperRef}
      >
        <button
          type="button"
          ref={triggerRef}
          className={`auren-service-trigger ${
            value ? "has-value" : ""
          }`}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="auren-service-options"
          onClick={() => setOpen((current) => !current)}
        >
          <span>
            {value || "Select a service"}
          </span>

          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div
            id="auren-service-options"
            className="auren-service-options"
          >
            <div className="auren-service-options-heading">
              CHOOSE YOUR EXPERIENCE
            </div>

            {services.map((item) => (
              <button
                key={item}
                type="button"
                className={`auren-service-option ${
                  value === item ? "is-selected" : ""
                }`}
                onClick={() => selectService(item)}
              >
                <span>{item}</span>

                {value === item && (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThankYouModal({ onClose }) {
  const closeRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="auren-thankyou-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="auren-thankyou-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auren-thankyou-title"
        aria-describedby="auren-thankyou-description"
      >
        <button
          type="button"
          className="auren-thankyou-close"
          onClick={onClose}
          aria-label="Close thank you popup"
        >
          ×
        </button>

        <div className="auren-thankyou-icon">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="29"
              className="auren-thankyou-circle"
            />

            <path
              d="M19 32.5L28 41L45 23"
              className="auren-thankyou-check"
            />
          </svg>
        </div>

        <p className="auren-thankyou-eyebrow">
          YOUR VOICE MATTERS
        </p>

        <h3 id="auren-thankyou-title">
          Thank you for
          <br />
          <em>sharing.</em>
        </h3>

        <p
          className="auren-thankyou-description"
          id="auren-thankyou-description"
        >
          Every experience tells a story.
          Thank you for making yours part of AUREN.
        </p>

        <div className="auren-thankyou-divider" />

        <p className="auren-thankyou-note">
          Your review has been saved to this browser's demo.
        </p>

        <button
          type="button"
          ref={closeRef}
          className="auren-thankyou-action"
          onClick={onClose}
        >
          CONTINUE EXPLORING
          <span aria-hidden="true">↗</span>
        </button>

        <span className="auren-thankyou-signature">
          AUREN — HAIR & BEAUTY ATELIER
        </span>
      </div>
    </div>
  );
}

function Feedback() {
  const [localReviews, setLocalReviews] =
    useState(loadLocalReviews);

  const [active, setActive] = useState(0);
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);

  const reviews = [...localReviews, ...demoReviews];
  const review = reviews[active] || reviews[0];

  const changeReview = (direction) => {
    setActive(
      (current) =>
        (current + direction + reviews.length) %
        reviews.length
    );
  };

  const closeThankYou = () => {
    setShowThankYou(false);
  };

  const submitReview = (event) => {
    event.preventDefault();
    setNotice("");

    if (!name.trim() || !service || !message.trim()) {
      setNotice("Please complete all fields.");
      return;
    }

    if (!rating) {
      setNotice("Please select a star rating.");
      return;
    }

    const newReview = {
      id: `local-${Date.now()}`,
      name: name.trim().slice(0, 60),
      service,
      rating,
      quote: message.trim().slice(0, 600),
      source: "website",
    };

    const updated = [newReview, ...localReviews];

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch {
      setNotice(
        "Unable to save the review. Check browser storage permissions."
      );
      return;
    }

    setLocalReviews(updated);
    setActive(0);

    setName("");
    setService("");
    setRating(0);
    setMessage("");

    setShowThankYou(true);
  };

  return (
    <section className="auren-feedback" id="feedback">
      <div className="auren-feedback-container">
        <div className="auren-feedback-heading">
          <p className="auren-feedback-eyebrow">
            <span className="auren-feedback-dot" />
            WORDS THAT MATTER
          </p>

          <h2>
            The experience,
            <br />
            <em>in their words.</em>
          </h2>

          <p className="auren-feedback-intro">
            Beyond the style. Beyond the service.
            An experience worth remembering.
          </p>
        </div>

        <div className="auren-feedback-panel">
          <div className="auren-feedback-panel-top">
            <span>THE AUREN EXPERIENCE</span>

            <span>
              {String(active + 1).padStart(2, "0")}
              {" / "}
              {String(reviews.length).padStart(2, "0")}
            </span>
          </div>

          <div className="auren-feedback-review-meta">
            <Stars rating={review.rating} />

            <span className="auren-feedback-review-source">
              {review.source === "website"
                ? "WEBSITE REVIEW · LOCAL DEMO"
                : "SAMPLE REVIEW"}
            </span>
          </div>

          <div className="auren-feedback-quote-mark">
            &ldquo;
          </div>

          <blockquote key={review.id}>
            {review.quote}
          </blockquote>

          <div className="auren-feedback-panel-bottom">
            <div className="auren-feedback-client">
              <span className="auren-feedback-avatar">
                {review.name.charAt(0).toUpperCase()}
              </span>

              <div>
                <strong>{review.name}</strong>
                <span>{review.service}</span>
              </div>
            </div>

            <div className="auren-feedback-controls">
              <button
                type="button"
                onClick={() => changeReview(-1)}
                aria-label="Previous review"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() => changeReview(1)}
                aria-label="Next review"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="auren-feedback-footer">
          <span>EVERY DETAIL. EVERY EXPERIENCE.</span>

          <span className="auren-feedback-demo">
            SAMPLE REVIEWS ARE FOR DEMONSTRATION ONLY
          </span>
        </div>

        {/* SHARE YOUR EXPERIENCE */}

        <div className="auren-review-section">
          <div className="auren-review-heading">
            <p className="auren-feedback-eyebrow">
              <span className="auren-feedback-dot" />
              YOUR VOICE MATTERS
            </p>

            <h3>
              Share your
              <br />
              <em>experience.</em>
            </h3>

            <p>
              Tell us about your AUREN experience.
              Every detail helps us make the next
              one even better.
            </p>
          </div>

          <form
            className="auren-review-form"
            onSubmit={submitReview}
          >
            <div className="auren-review-form-top">
              <span>LEAVE A REVIEW</span>
              <span>YOUR EXPERIENCE, YOUR WORDS</span>
            </div>

            <div className="auren-review-fields">
              <label>
                YOUR NAME
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <ServiceDropdown
                value={service}
                onChange={setService}
              />
            </div>

            <div className="auren-review-rating-field">
              <span>YOUR RATING</span>

              <Stars
                rating={rating}
                interactive
                onChange={setRating}
              />

              <small>
                {rating
                  ? `${rating} out of 5 stars`
                  : "Select your rating"}
              </small>
            </div>

            <label className="auren-review-message">
              SHARE YOUR EXPERIENCE
              <textarea
                placeholder="Tell us how your experience was..."
                value={message}
                maxLength={600}
                rows={5}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                required
              />
            </label>

            <div className="auren-review-submit-row">
              <span>
                Demo reviews are saved only in
                your browser.
              </span>

              <button type="submit">
                SUBMIT REVIEW
                <span aria-hidden="true">↗</span>
              </button>
            </div>

            {notice && (
              <p
                className="auren-review-notice"
                role="status"
                aria-live="polite"
              >
                {notice}
              </p>
            )}
          </form>
        </div>
      </div>

      {showThankYou && (
        <ThankYouModal onClose={closeThankYou} />
      )}
    </section>
  );
}

export default Feedback;
