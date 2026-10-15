
import { useEffect } from "react";

import Navbar from "../../components/Navbar/Navbar";
import Hero from "../../components/Hero/Hero";
import Services from "../../components/Services/Services";
import Gallery from "../../components/Gallery/Gallery";
import Artists from "../../components/Artists/Artists";
import Feedback from "../../components/Feedback/Feedback";
import Contact from "../../components/Contact/Contact";
import Footer from "../../components/Footer/Footer";

import "./Home.css";

function Home() {
  useEffect(() => {
    // Prevent browser from restoring previous scroll position
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Start homepage from the top on refresh
    if (!window.location.hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Services />
        <Gallery />
        <Artists />
        <Feedback />
        <Contact />
      </main>

      <Footer />
    </>
  );
}

export default Home;
