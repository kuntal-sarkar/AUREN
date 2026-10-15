
import { useEffect, useRef, useState } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa6";
import "./Contact.css";
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

    const handleSubmit = (event) => {
        event.preventDefault();

        // The enquiry form remains independent for now.
        // Later: POST form data to the backend enquiry API.
        // Do not show a success confirmation until a server
        // has actually received and stored the enquiry.
    };

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

                            <EnquiryDropdown
                                value={form.subject}
                                onChange={(subject) =>
                                    setForm((previous) => ({ ...previous, subject }))
                                }
                            />
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
                                Enquiry submission will be available
                                when our backend is connected.
                            </p>

                            <button
                                type="submit"
                                className="auren-contact-submit"
                                disabled
                                title="Backend integration pending"
                            >
                                SEND ENQUIRY
                                <span aria-hidden="true">↗</span>
                            </button>
                        </div>
                    </form>
                </div>

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
