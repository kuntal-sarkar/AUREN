
import "./IntroAnimation.css";

function IntroAnimation() {
    return (
        <section className="auren-intro">
            <div className="auren-intro-content">
                <p className="auren-intro-label">
                    HAIR • BEAUTY • ATELIER
                </p>

                <h1 className="auren-intro-title">
                    AUREN
                </h1>

                <p className="auren-intro-tagline">
                    Your Style. Our Art.
                </p>

                <a href="/home" className="auren-intro-button">
                    Explore AUREN
                    <span aria-hidden="true">↗</span>
                </a>
            </div>
        </section>
    );
}

export default IntroAnimation;
