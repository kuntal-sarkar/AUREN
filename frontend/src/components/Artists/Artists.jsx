
import { useState } from "react";
import "./Artists.css";

const artists = [
  {
    id: 1,
    name: "Grooming Artist",
    role: "Men's Hair & Beard Specialist",
    specialty: "Precision Cuts • Beard Styling",
    image: "/images/artists/artist-01.jpg",
    category: "GROOMING",
  },
  {
    id: 2,
    name: "Hair Colour Specialist",
    role: "Creative Colour Expert",
    specialty: "Balayage • Highlights • Colour",
    image: "/images/artists/artist-02.jpg",
    category: "HAIR COLOUR",
  },
  {
    id: 3,
    name: "Hair Director",
    role: "Creative Hair Director",
    specialty: "Hair Design • Transformations",
    image: "/images/artists/artist-03.jpg",
    category: "HAIR ARTISTRY",
  },
  {
    id: 4,
    name: "Makeup Specialist",
    role: "Professional Makeup Artist",
    specialty: "Bridal • Party • Editorial",
    image: "/images/artists/artist-04.jpg",
    category: "MAKEUP",
  },
  {
    id: 5,
    name: "Nail Artist",
    role: "Nail Design Specialist",
    specialty: "Nail Art • Manicure • Pedicure",
    image: "/images/artists/artist-05.jpg",
    category: "NAIL ATELIER",
  },
  {
    id: 6,
    name: "Senior Hair Stylist",
    role: "Senior Styling Professional",
    specialty: "Haircuts • Styling • Finishing",
    image: "/images/artists/artist-06.jpg",
    category: "HAIR STYLING",
  },
  {
    id: 7,
    name: "Skin & Facial Expert",
    role: "Skincare Specialist",
    specialty: "Facials • Skin Treatments",
    image: "/images/artists/artist-07.jpg",
    category: "SKINCARE",
  },
  {
    id: 8,
    name: "Spa & Wellness Expert",
    role: "Spa Therapist",
    specialty: "Relaxation • Spa Rituals",
    image: "/images/artists/artist-08.jpg",
    category: "SPA",
  },
  {
    id: 9,
    name: "Wellness Expert",
    role: "Wellness Professional",
    specialty: "Therapeutic Care • Relaxation",
    image: "/images/artists/artist-09.jpg",
    category: "WELLNESS",
  },
  {
    id: 10,
    name: "Hair Specialist",
    role: "Hair Treatment Expert",
    specialty: "Hair Spa • Repair • Nourishment",
    image: "/images/artists/artist-10.jpg",
    category: "HAIR CARE",
  },
  
  {
    id: 11,
    name: "Scalp & Hair Treatment Expert",
    role: "Advanced Hair Care Specialist",
    specialty: "Scalp Care • Repair • Nourishment",
    image: "/images/artists/artist-11.jpg",
    category: "HAIR THERAPY",
  },
  {
    id: 12,
    name: "Curl & Texture Specialist",
    role: "Natural Hair & Texture Expert",
    specialty: "Curls • Waves • Textured Styling",
    image: "/images/artists/artist-12.jpg",
    category: "CURL ARTISTRY",
  },

];

function ArtistImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!loaded && !failed && (
        <div
          className="auren-artist-skeleton"
          aria-hidden="true"
        />
      )}

      {failed ? (
        <div className="auren-artist-image-error">
          Image unavailable
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={loaded ? "is-loaded" : ""}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}

function Artists() {
  return (
    <section className="auren-artists" id="artists">
      <div className="auren-artists-container">
        <div className="auren-artists-header">
          <div>
            <p className="auren-artists-eyebrow">
              <span />
              THE PEOPLE BEHIND THE ART
            </p>

            <h2 className="auren-artists-title">
              Meet the
              <br />
              <em>visionaries.</em>
            </h2>
          </div>

          <p className="auren-artists-description">
            Individual talent. Shared passion.
            Discover the specialists behind every
            AUREN experience.
          </p>
        </div>

        <div className="auren-artists-grid">
          {artists.map((artist, index) => (
            <article
              className="auren-artist-card"
              key={artist.id}
            >
              <div className="auren-artist-image-wrapper">
                <ArtistImage
                  src={artist.image}
                  alt={artist.name}
                />

                <span className="auren-artist-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="auren-artist-specialty-tag">
                  {artist.category}
                </span>
              </div>

              <div className="auren-artist-info">
                <div>
                  <h3>{artist.name}</h3>

                  <p className="auren-artist-role">
                    {artist.role}
                  </p>

                  <p className="auren-artist-specialty">
                    {artist.specialty}
                  </p>
                </div>

                <a
                  href="#booking"
                  className="auren-artist-book"
                  aria-label={`Book ${artist.name}`}
                >
                  ↗
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="auren-artists-footer">
          <span>
            GREAT STYLE BEGINS WITH GREAT PEOPLE.
          </span>

          <a href="#booking">
            FIND YOUR ARTIST
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default Artists;
