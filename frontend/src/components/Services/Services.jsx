
import { useState, useRef, useLayoutEffect } from "react";
import "./Services.css";

const categories = [
    "All",
    "Hair",
    "Grooming",
    "Skin",
    "Nails",
    "Makeup",
    "Spa",
];

const services = [
    {
        id: 1,
        name: "Precision Haircut",
        category: "Hair",
        description:
            "A personalised cut shaped around your individual style.",
        image:
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=85",
        number: "01",
    },
    {
        id: 2,
        name: "Hair Colour & Balayage",
        category: "Hair",
        description:
            "Dimensional colour and luminous finishes crafted by specialists.",
        image:
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=85",
        number: "02",
    },
    {
        id: 3,
        name: "Signature Grooming",
        category: "Grooming",
        description:
            "Refined cuts, beard detailing and a modern grooming experience.",
        image:
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=85",
        number: "03",
    },
    {
        id: 4,
        name: "Skin & Facial Rituals",
        category: "Skin",
        description:
            "Thoughtfully designed treatments for refreshed, radiant skin.",
        image:
            "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&q=85",
        number: "04",
    },
    {
        id: 5,
        name: "Nail Atelier",
        category: "Nails",
        description:
            "Modern manicures, pedicures and expressive nail artistry.",
        image:
            "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=85",
        number: "05",
    },
    {
        id: 6,
        name: "Bridal & Occasion",
        category: "Makeup",
        description:
            "Elegant beauty styling for your most memorable moments.",
        image:
            "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=85",
        number: "06",
    },
    {
        id: 7,
        name: "Hair Spa & Treatments",
        category: "Spa",
        description:
            "Restorative care for healthy, nourished and beautiful hair.",
        image:
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=85",
        number: "07",
    },
];

function Services() {
    const [activeCategory, setActiveCategory] = useState("All");


    const filterRef = useRef(null);
    const buttonRefs = useRef({});
    const [indicator, setIndicator] = useState(null);

    useLayoutEffect(() => {
        const updateIndicator = () => {
            const activeButton = buttonRefs.current[activeCategory];

            if (!activeButton) return;

            setIndicator({
                left: activeButton.offsetLeft,
                top: activeButton.offsetTop,
                width: activeButton.offsetWidth,
                height: activeButton.offsetHeight,
            });
        };

        updateIndicator();

        const observer = new ResizeObserver(updateIndicator);

        if (filterRef.current) {
            observer.observe(filterRef.current);
        }

        window.addEventListener("resize", updateIndicator);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateIndicator);
        };
    }, [activeCategory]);


    const filteredServices =
        activeCategory === "All"
            ? services
            : services.filter(
                (service) => service.category === activeCategory
            );

    return (
        <section className="auren-services" id="services">
            <div className="auren-services-container">
                <div className="auren-services-header">
                    <div>
                        <p className="auren-services-eyebrow">
                            <span />
                            EXPLORE OUR EXPERTISE
                        </p>

                        <h2 className="auren-services-heading">
                            The art of
                            <br />
                            <em>looking exceptional.</em>
                        </h2>
                    </div>

                    <p className="auren-services-intro">
                        From precision styling to indulgent beauty rituals,
                        discover experiences designed around you.
                    </p>
                </div>


                <div
                    className="auren-services-filters"
                    ref={filterRef}
                    role="group"
                    aria-label="Filter services"
                >
                    {indicator && (
                        <span
                            className="auren-service-indicator"
                            style={{
                                left: indicator.left,
                                top: indicator.top,
                                width: indicator.width,
                                height: indicator.height,
                            }}
                            aria-hidden="true"
                        />
                    )}

                    {categories.map((category) => (
                        <button
                            key={category}
                            ref={(element) => {
                                buttonRefs.current[category] = element;
                            }}
                            type="button"
                            className={`auren-service-filter ${activeCategory === category
                                ? "auren-service-filter-active"
                                : ""
                                }`}
                            onClick={() => setActiveCategory(category)}
                            aria-pressed={activeCategory === category}
                        >
                            {category}
                        </button>
                    ))}
                </div>


                <div className="auren-services-grid">
                    {filteredServices.map((service) => (
                        <article className="auren-service-card" key={service.id}>
                            <div className="auren-service-image-wrapper">
                                <img
                                    src={service.image}
                                    alt={service.name}
                                    loading="lazy"
                                    decoding="async"
                                />

                                <span className="auren-service-number">
                                    {service.number}
                                </span>

                                <span className="auren-service-category">
                                    {service.category}
                                </span>
                            </div>

                            <div className="auren-service-info">
                                <div>
                                    <h3>{service.name}</h3>
                                    <p>{service.description}</p>
                                </div>

                                <a
                                    href="#booking"
                                    className="auren-service-arrow"
                                    aria-label={`Book ${service.name}`}
                                >
                                    ↗
                                </a>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Services;
