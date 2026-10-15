
import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";

import "./Gallery.css";

const categories = [
  "All Work",
  "Hair",
  "Grooming",
  "Beauty",
  "Nails",
];

const galleryItems = [
  {
    id: 1,
    title: "Precision Styling",
    category: "Hair",
    image: "/images/gallery/hair-01.jpg",
    position: 1,
  },
  {
    id: 2,
    title: "Modern Grooming",
    category: "Grooming",
    image: "/images/gallery/grooming-01.jpg",
    position: 2,
  },
  {
    id: 3,
    title: "Colour Artistry",
    category: "Hair",
    image: "/images/gallery/hair-02.jpg",
    position: 3,
  },
  {
    id: 4,
    title: "Signature Beauty",
    category: "Beauty",
    image: "/images/gallery/beauty-01.jpg",
    position: 4,
  },
  {
    id: 5,
    title: "Nail Atelier",
    category: "Nails",
    image: "/images/gallery/nails-01.jpg",
    position: 5,
  },
  {
    id: 6,
    title: "The Finishing Touch",
    category: "Grooming",
    image: "/images/gallery/grooming-02.jpg",
    position: 6,
  },
  {
    id: 7,
    title: "Signature Blowout",
    category: "Hair",
    image: "/images/gallery/hair-03.jpg",
    position: 7,
  },
  {
    id: 8,
    title: "Artistic Nail Design",
    category: "Nails",
    image: "/images/gallery/nails-02.jpg",
    position: 8,
  },
];

// IMAGE WITH ANIMATED SKELETON

function GalleryImage({ src, alt, eager = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`auren-gallery-image-frame ${
        loaded ? "is-loaded" : ""
      }`}
    >
      {!loaded && !failed && (
        <div
          className="auren-gallery-skeleton"
          aria-hidden="true"
        />
      )}

      {failed ? (
        <div className="auren-gallery-image-error">
          Image unavailable
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function Gallery() {
  const [activeCategory, setActiveCategory] =
    useState("All Work");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [indicator, setIndicator] = useState(null);

  const filterRef = useRef(null);
  const buttonRefs = useRef({});

  // SINGLE SLIDING GLASS INDICATOR

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const button = buttonRefs.current[activeCategory];

      if (!button) return;

      setIndicator({
        left: button.offsetLeft,
        top: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
      });
    };

    updateIndicator();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateIndicator)
        : null;

    if (filterRef.current) {
      observer?.observe(filterRef.current);
    }

    Object.values(buttonRefs.current).forEach((button) => {
      if (button) observer?.observe(button);
    });

    window.addEventListener("resize", updateIndicator);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeCategory]);

  // FILTER + ORDER

  const filteredItems = galleryItems
    .filter(
      (item) =>
        activeCategory === "All Work" ||
        item.category === activeCategory
    )
    .sort((a, b) => a.position - b.position);

  // LIGHTBOX KEYBOARD + SCROLL LOCK

  useEffect(() => {
    if (!selectedImage) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage]);

  return (
    <section className="auren-gallery" id="gallery">
      <div className="auren-gallery-container">
        {/* HEADING */}

        <div className="auren-gallery-header">
          <div>
            <p className="auren-gallery-eyebrow">
              <span />
              THE AUREN PORTFOLIO
            </p>

            <h2 className="auren-gallery-title">
              Our work.
              <br />
              <em>Our signature.</em>
            </h2>
          </div>

          <p className="auren-gallery-description">
            An evolving collection of creativity,
            craftsmanship and personal expression.
          </p>
        </div>

        {/* LIQUID GLASS FILTER BAR */}

        <div
          className="auren-gallery-filters"
          ref={filterRef}
          role="group"
          aria-label="Filter gallery"
        >
          {indicator && (
            <span
              className="auren-gallery-indicator"
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
              className={`auren-gallery-filter ${
                activeCategory === category
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setActiveCategory(category);

                buttonRefs.current[
                  category
                ]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "nearest",
                });
              }}
              aria-pressed={activeCategory === category}
            >
              {category}
            </button>
          ))}
        </div>

        {/* BALANCED PHOTO GRID */}

        <div
          className="auren-gallery-grid"
          key={activeCategory}
        >
          {filteredItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className="auren-gallery-item"
              onClick={() => setSelectedImage(item)}
              aria-label={`View ${item.title}`}
            >
              <GalleryImage
                src={item.image}
                alt={item.title}
              />

              <span className="auren-gallery-item-overlay">
                <span>
                  <small>{item.category}</small>
                  <strong>{item.title}</strong>
                </span>

                <span className="auren-gallery-expand">
                  ↗
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="auren-gallery-footer">
          <span>
            CRAFTED WITH CARE. DEFINED BY DETAIL.
          </span>

          <span>
            {String(filteredItems.length).padStart(2, "0")}
            {" / "}
            {String(galleryItems.length).padStart(2, "0")}
            {" "}WORKS
          </span>
        </div>
      </div>

      {/* LIGHTBOX */}

      {selectedImage && (
        <div
          className="auren-gallery-lightbox"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="auren-gallery-lightbox-content"
            role="dialog"
            aria-modal="true"
            aria-label={selectedImage.title}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="auren-gallery-close"
              type="button"
              onClick={() => setSelectedImage(null)}
              aria-label="Close image"
            >
              ×
            </button>

            <GalleryImage
              src={selectedImage.image}
              alt={selectedImage.title}
              eager
            />

            <p>{selectedImage.title}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default Gallery;
