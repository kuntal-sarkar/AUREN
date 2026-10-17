import { useEffect, useRef, useState } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa6";
import "./Contact.css";

const ENQUIRY_API = import.meta.env.VITE_BOOKING_API_URL || "http://127.0.0.1:5001";
import "./ContactMapPrivacy.css";
import { readConsent } from "../PrivacyManager/PrivacyManager";

/* ==========================================
   AUREN — DEMO CONTACT CONFIGURATION
   Replace with salon owner's details later
========================================== */

const salon = {
    name: "AUREN",

    location: "Park Street, Kolkata",
    locationNote: "Demo location — not an AUREN salon address",

    whatsapp: "916295243331",

    instagram:
        "https://www.instagram.com/kuntal.exe.x",

    mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Park+Street%2C+Kolkata",

    mapEmbedUrl:
        "https://maps.google.com/maps?q=Park%20Street%2C%20Kolkata&t=&z=15&ie=UTF8&iwloc=&output=embed",
};

const initialForm = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
};

const subjects = [
    "General Enquiry",
    "Services & Pricing",
    "Booking Assistance",
    "Bridal & Events",
    "Collaboration",
    "Other",
];

function EnquiryDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const trigger = useRef(null);

    useEffect(() => {
        if (!open) return;
        const outside = (event) => {
            if (!root.current?.contains(event.target)) setOpen(false);
        };
        const escape = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                trigger.current?.focus();
            }
        };
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("pointerdown", outside);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);

    return (
        <div className="auren-enquiry-select-field" ref={root}>
            <span className="auren-enquiry-select-label">ENQUIRY ABOUT *</span>
            <div className={`auren-enquiry-dropdown ${open ? "is-open" : ""}`}>
                <button
                    type="button"
                    ref={trigger}
                    className={`auren-enquiry-trigger ${value ? "has-value" : ""}`}
                    aria-expanded={open}
                    aria-controls="auren-enquiry-options"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    <span>{value || "Select a subject"}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
                        strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                {open && (
                    <div id="auren-enquiry-options" className="auren-enquiry-options">
                        <div className="auren-enquiry-options-heading">CHOOSE A SUBJECT</div>
                        {subjects.map((subject) => (
                            <button
                                type="button"
                                key={subject}
                                className={`auren-enquiry-option ${value === subject ? "is-selected" : ""}`}
                                onClick={() => {
                                    onChange(subject);
                                    setOpen(false);
                                    trigger.current?.focus();
                                }}
                            >
                                <span>{subject}</span>
                                {value === subject && <span aria-hidden="true">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Contact() {
    const [form, setForm] = useState(initialForm);
    const [showThankYou, setShowThankYou] = useState(false);
    const [sending, setSending] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const thankYouCloseRef = useRef(null);
    const [mapsAllowed, setMapsAllowed] = useState(
        () => readConsent()?.functional === true
    );

    useEffect(() => {
        const syncMapPermission = () => {
            setMapsAllowed(readConsent()?.functional === true);
        };

        window.addEventListener("auren:consent-change", syncMapPermission);
        window.addEventListener("storage", syncMapPermission);
        return () => {
            window.removeEventListener("auren:consent-change", syncMapPermission);
            window.removeEventListener("storage", syncMapPermission);
        };
    }, []);

    const openPrivacySettings = () => {
        window.dispatchEvent(new Event("auren:open-cookie-preferences"));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (sending) return;
        setSubmitError("");
        if (!form.subject) {
            document.getElementById("auren-enquiry-subject-error")?.scrollIntoView({
                behavior: "smooth", block: "center",
            });
            return;
        }
        setSending(true);
        try {
            const response = await fetch(`${ENQUIRY_API}/api/enquiries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(), email: form.email.trim(),
                    phone: form.phone.trim(), subject: form.subject,
                    message: form.message.trim(),
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Enquiry could not be sent.");
            setForm({ ...initialForm });
            setShowThankYou(true);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Connection failed. Please try again.");
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        if (!showThankYou) return;
        const onEscape = (event) => {
            if (event.key === "Escape") setShowThankYou(false);
        };
        window.addEventListener("keydown", onEscape);
        thankYouCloseRef.current?.focus();
        return () => window.removeEventListener("keydown", onEscape);
    }, [showThankYou]);

    const whatsappUrl =
        `https://wa.me/${salon.whatsapp}` +
        `?text=${encodeURIComponent(
            "Hello! I found AUREN online and would like to enquire."
        )}`;

    return (
        <section className="auren-contact" id="contact">
            <div className="auren-contact-container">

                {/* HEADER */}

                <div className="auren-contact-header">
                    <div>
                        <p className="auren-contact-eyebrow">
                            <span className="auren-contact-dot" />
                            FIND YOUR WAY TO AUREN
                        </p>

                        <h2 className="auren-contact-title">
                            Come as you are.
                            <br />
                            <em>Leave extraordinary.</em>
                        </h2>
                    </div>

                    <p className="auren-contact-description">
                        Your next great experience starts here.
                        Find us, connect with us, or leave a message.
                    </p>
                </div>

                {/* LOCATION + MAP */}

                <div className="auren-contact-grid">
                    <div className="auren-contact-details">

                        <div className="auren-contact-info-card">
                            <span className="auren-contact-index">
                                01 / LOCATION
                            </span>

                            <h3>Visit the atelier.</h3>

                            <p className="auren-contact-address">
                                {salon.location}
                                <br />
                                <small>{salon.locationNote}</small>
                            </p>

                            <div className="auren-contact-actions">
                                <a
                                    href={salon.mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="auren-contact-primary-btn"
                                >
                                    EXPLORE LOCATION
                                    <span aria-hidden="true">↗</span>
                                </a>
                            </div>
                        </div>

                        <div className="auren-contact-info-card">
                            <span className="auren-contact-index">
                                02 / STAY CONNECTED
                            </span>

                            <h3>Let's connect.</h3>

                            <p className="auren-contact-address">
                                A conversation is always a good
                                place to begin.
                            </p>

                            <div className="auren-contact-social-links">
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="auren-contact-social-link"
                                >
                                    <span className="auren-contact-social-name">
                                        <FaWhatsapp
                                            className="auren-contact-brand-icon"
                                            aria-hidden="true"
                                        />
                                        WHATSAPP
                                    </span>

                                    <span aria-hidden="true">↗</span>
                                </a>

                                <a
                                    href={salon.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="auren-contact-social-link"
                                >
                                    <span className="auren-contact-social-name">
                                        <FaInstagram
                                            className="auren-contact-brand-icon"
                                            aria-hidden="true"
                                        />
                                        INSTAGRAM
                                    </span>

                                    <span aria-hidden="true">↗</span>
                                </a>
                            </div>
                        </div>

                    </div>

                    <div className="auren-contact-right">
                        <div className="auren-contact-map">
                            {mapsAllowed ? (
                                <iframe
                                    src={salon.mapEmbedUrl}
                                    title="Demo location: Park Street, Kolkata"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="auren-map-privacy-placeholder">
                                    <span className="auren-map-privacy-symbol" aria-hidden="true">✦</span>
                                    <span className="auren-map-privacy-eyebrow">YOUR PRIVACY MATTERS</span>
                                    <h3>Explore the location.</h3>
                                    <p>
                                        Enable Functional / Maps in your privacy settings
                                        to display the interactive Google map.
                                    </p>
                                    <button type="button" onClick={openPrivacySettings}>
                                        MAP PREFERENCES <span aria-hidden="true">↗</span>
                                    </button>
                                </div>
                            )}

                            <div className="auren-contact-map-caption">
                                <span>LOCATION PREVIEW</span>
                                <span>PARK STREET, KOLKATA · DEMO</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INDEPENDENT ENQUIRY FORM */}

                <div className="auren-contact-enquiry" id="enquiry">

                    <div className="auren-contact-enquiry-heading">
                        <p className="auren-contact-eyebrow">
                            <span className="auren-contact-dot" />
                            WE'D LOVE TO HEAR FROM YOU
                        </p>

                        <h3>
                            Have a question?
                            <br />
                            <em>Let's talk.</em>
                        </h3>

                        <p>
                            Whether it's about our services,
                            appointments or something else,
                            we'd love to hear what you have in mind.
                        </p>
                    </div>

                    <form
                        className="auren-contact-enquiry-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="auren-contact-form-heading">
                            <span>GENERAL ENQUIRIES</span>
                            <span>01 — 05</span>
                        </div>

                        <div className="auren-contact-form-grid">

                            <label>
                                YOUR NAME *
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    autoComplete="name"
                                    maxLength={80}
                                    required
                                />
                            </label>

                            <label>
                                EMAIL ADDRESS *
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    maxLength={120}
                                    required
                                />
                            </label>

                            <label>
                                PHONE NUMBER
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+91 XXXXX XXXXX"
                                    autoComplete="tel"
                                    maxLength={20}
                                />
                            </label>

                            <div id="auren-enquiry-subject-error">
                                <EnquiryDropdown
                                    value={form.subject}
                                    onChange={(subject) =>
                                        setForm((previous) => ({ ...previous, subject }))
                                    }
                                />
                            </div>
                        </div>

                        <label className="auren-contact-message-field">
                            YOUR MESSAGE *
                            <textarea
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                placeholder="Tell us what's on your mind..."
                                rows={5}
                                maxLength={1500}
                                required
                            />
                        </label>

                        <div className="auren-contact-form-bottom">
                            <p>
                                Your enquiry will be sent securely to our reception team.
                            </p>

                            <button
                                type="submit"
                                className="auren-contact-submit"
                                disabled={sending}
                            >
                                {sending ? "SENDING…" : "SEND ENQUIRY"}
                                <span aria-hidden="true">↗</span>
                            </button>
                        </div>
                        {submitError && <p className="auren-enquiry-submit-error" role="alert">{submitError}</p>}
                    </form>
                </div>

                {showThankYou && (
                    <div
                        className="auren-thankyou-overlay"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setShowThankYou(false);
                        }}
                    >
                        <div
                            className="auren-thankyou-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="auren-thankyou-title"
                            aria-describedby="auren-thankyou-description"
                        >
                            <p className="auren-thankyou-brand">AUREN.</p>
                            <div className="auren-thankyou-mark" aria-hidden="true">
                                <svg className="auren-thankyou-check" viewBox="0 0 108 108" focusable="false">
                                    <circle className="auren-thankyou-check-ring" cx="54" cy="54" r="46" />
                                    <path className="auren-thankyou-check-tick" d="M31 54 L47 70 L78 38" />
                                </svg>
                            </div>
                            <p className="auren-thankyou-eyebrow">A MOMENT OF APPRECIATION</p>
                            <h3 id="auren-thankyou-title">
                                Thank you for <em>reaching out.</em>
                            </h3>
                            <p id="auren-thankyou-description" className="auren-thankyou-description">
                                We appreciate you taking the time to connect with AUREN.
                            </p>
                            <p className="auren-thankyou-demo-note">
                                Your enquiry has been received by AUREN.
                            </p>
                            <div className="auren-thankyou-actions">
                                <button
                                    ref={thankYouCloseRef}
                                    type="button"
                                    className="auren-thankyou-close"
                                    onClick={() => setShowThankYou(false)}
                                >
                                    BACK TO AUREN
                                    <span className="auren-thankyou-close-arrow" aria-hidden="true">↗</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER */}

                <div className="auren-contact-footer">
                    <span>
                        AUREN — HAIR & BEAUTY ATELIER
                    </span>

                    <span>
                        YOUR NEXT CHAPTER BEGINS HERE.
                    </span>
                </div>
            </div>
        </section>
    );
}

export default Contact;
