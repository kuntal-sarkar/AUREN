import { Link, useParams } from "react-router-dom";
import Footer from "../../components/Footer/Footer";
import "./LegalPage.css";

// DEMO DRAFTS ONLY. Verify each section against the salon's actual operations and applicable law.
const pages = {
  terms: { title: "Terms & Conditions", subtitle: "How this demonstration website is intended to be used.", sections: [
    ["About this demo", "AUREN is currently a demonstration salon website, not a verified trading salon. Services, staff specialties, locations, prices, and opening hours shown as examples are not offers or confirmed facts."],
    ["Using the website", "Please use the site lawfully and avoid submitting abusive, misleading, or unlawful content. Do not attempt to disrupt its operation."],
    ["Bookings and payments", "A live booking and payment system is not yet active. Browsing, clicking a booking link, or filling a disabled enquiry form does not create an appointment or payment obligation."],
    ["Website reviews", "Sample testimonials are illustrative. Reviews entered in the demo are stored in your browser, not verified by the salon or shared across visitors."],
    ["Changes and liability", "Features and demo text may change. Before commercial launch, the operator should publish its legal business details, customer obligations, cancellation policy, limitations, and dispute process."],
  ]},
  privacy: { title: "Privacy Policy", subtitle: "What happens to personal information in this demo.", sections: [
    ["Who operates this website?", "AUREN is presently a demo brand. Before commercial launch, identify the actual salon operator, business address, and privacy contact here."],
    ["Information you enter", "The review form collects the display name, selected service, rating, and written review. It currently stores that review in browser localStorage. The enquiry form visually collects name, email, optional phone, subject, and message, but submission is disabled; no enquiry is sent to a server."],
    ["Third-party services", "The Contact section links to WhatsApp and Instagram. The Google Maps embed may share data with Google if you permit functional content and load the map. External sites follow their own policies."],
    ["Cookies and local storage", "The site uses local storage for demo review content and saved consent preferences. Optional functional map content is controlled by consent. No analytics or marketing SDK is installed in this package."],
    ["Storage, recipients, and security", "Demo reviews and consent choices remain on the current browser unless you clear them. Once a database or email handling is added, this policy must identify processors, safeguards, retention, recipients, and legal basis as relevant."],
    ["Your choices", "Use Cookie Preferences in the footer to modify optional categories. You can clear this site's local storage using browser controls. Future production requests for access, correction, or deletion need a verified contact and response process."],
  ]},
  cookies: { title: "Cookie Policy", subtitle: "Essential storage and optional external features.", sections: [
    ["Essential storage", "The demo stores your cookie preference choice under a localStorage key, auren_cookie_preferences_v1. It may also store reviews under auren_demo_reviews. Local storage is not itself an HTTP cookie."],
    ["Functional content", "Google Maps is optional. When you enable Functional / Maps, your browser may contact Google and Google may use its own cookies or related technologies."],
    ["Analytics and marketing", "This package does not install analytics or marketing tools. The corresponding switches reserve choices for future integrations; turning them on does not install or activate any such provider."],
    ["Managing your choices", "Select Cookie Preferences in the footer to accept, reject, or edit optional categories. You can also clear site data using your browser settings."],
  ]},
  "third-party": { title: "Third-Party Services", subtitle: "External platforms used or contemplated by the demo.", sections: [
    ["Google Maps", "The optional map displays a demo public area in Park Street, Kolkata. Loading it can send information such as IP address and browser data to Google. Review Google's current terms and privacy information before enabling it."],
    ["WhatsApp", "The WhatsApp contact link opens Meta's WhatsApp service. Clicking it is your choice; messages are processed according to WhatsApp's own policies."],
    ["Instagram", "The Instagram link opens an external profile hosted by Meta. We do not control Instagram's data processing."],
    ["Google reviews, payment, analytics, booking APIs", "These integrations are planned or optional, not included in this demo. If added, this notice and privacy controls must be updated before deployment, with appropriate attribution, credentials, disclosures, and consent handling."],
  ]},
  data: { title: "Data We Collect", subtitle: "A transparent summary of the current implementation.", sections: [
    ["Demo review form", "Display name, service selected, star rating, and review text are saved locally in your current browser so the demo carousel can show them."],
    ["Enquiry form", "The interface includes name, email address, optional phone number, enquiry subject, and message. SEND ENQUIRY is disabled, so this demo does not submit that information to any backend."],
    ["Consent settings", "The browser stores whether you allow functional/maps, analytics, and marketing categories. Essential preferences remain enabled."],
    ["Maps and external links", "Google receives a request only if you authorize and load the embedded map. WhatsApp and Instagram receive data when you choose to follow their links, under those providers' policies."],
    ["Future booking details", "Appointment service, artist, date/time, customer contact, and payment details are not yet collected by this package. Those fields and their processors must be documented if booking is deployed."],
  ]},
  rights: { title: "Your Privacy Rights", subtitle: "Choices available now and controls needed at launch.", sections: [
    ["Control optional content", "Open Cookie Preferences from the footer to enable or disable optional integrations, including the embedded Google Map."],
    ["Remove demo local data", "You can remove saved reviews and consent preferences by clearing this website's local storage in your browser. Doing so also resets your choices."],
    ["Production access and deletion requests", "When customer accounts, enquiries, reviews or bookings are stored on a server, the salon should publish a monitored privacy contact and a process for data access, correction, deletion and withdrawal requests where applicable."],
    ["Applicable law", "Rights and response requirements differ by location and circumstances. The salon operator should review the applicable Indian data protection framework and any other relevant laws before launch."],
  ]},
  cancellation: { title: "Cancellation & Refunds", subtitle: "Placeholder until the salon defines its real booking rules.", sections: [
    ["Current demo", "No live appointments, deposits, or payment processing are active in this demo, so no cancellation or refund can be processed through it."],
    ["Before production", "The salon must specify cancellation notice periods, late arrivals, no-shows, deposits, rescheduling, refund eligibility, payout timelines, and exceptions. Publish those terms before accepting bookings or payments."],
    ["Need help?", "Contact the actual salon directly once the production business contact details are configured."],
  ]},
  accessibility: { title: "Accessibility", subtitle: "Building an experience usable by more people.", sections: [
    ["Our approach", "The design aims to support keyboard access, legible contrast, responsive layouts, and reduced-motion preferences. This is a design goal, not a certification or accessibility compliance claim."],
    ["Known limitations", "Third-party content and future interactive booking features need separate accessibility testing. Full screen-reader and keyboard audits have not been completed."],
    ["Feedback", "Before launch, the business should provide an accessible contact method for reporting barriers and requesting assistance."],
  ]},
  faq: { title: "Frequently Asked Questions", subtitle: "Quick answers about this demonstration.", sections: [
    ["Can I book an appointment now?", "Not yet. The production booking flow, staff availability, and confirmation system have not been connected."],
    ["Are these real salon reviews?", "No. Built-in testimonials are clearly labeled sample content. Customer reviews entered in this demo are saved only in the same browser."],
    ["Is Park Street the salon address?", "No. Park Street, Kolkata is a public demo map location and is not represented as the salon's real address."],
    ["Can I change privacy choices?", "Yes. Choose Cookie Preferences in the footer to change optional categories."],
  ]},
};
export default function LegalPage() {
  const { slug } = useParams();
  const page = pages[slug];
  if (!page) return <div className="auren-legal"><Link to="/home">← Back to AUREN</Link><h1>Page not found.</h1></div>;
  return <><main className="auren-legal">
    <div className="auren-legal-container"><Link className="auren-legal-back" to="/home">← BACK TO AUREN</Link>
      <p className="auren-legal-eyebrow">AUREN / INFORMATION</p>
      <h1>{page.title}<span>.</span></h1><p className="auren-legal-lead">{page.subtitle}</p>
      <p className="auren-legal-draft">DEMO DRAFT — Review and replace with the actual salon's business practices and professional legal advice before going live.</p>
      <div className="auren-legal-sections">{page.sections.map(([heading, body],i) => <section key={heading}>
        <span>{String(i+1).padStart(2,"0")}</span><div><h2>{heading}</h2><p>{body}</p></div>
      </section>)}</div>
      <Link className="auren-legal-back" to="/home#contact">CONTACT / HOME ↗</Link>
    </div>
  </main><Footer /></>;
}
