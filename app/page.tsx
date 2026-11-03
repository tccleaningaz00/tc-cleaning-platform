import GoogleReviews from "./components/google-reviews";
import PriceCalculator from "./components/price-calculator";
import Image from "next/image";

const services = [
  {
    number: "01",
    title: "Residential Cleaning",
    description:
      "Professional home cleaning with attention to detail, consistency, and care.",
  },
  {
    number: "02",
    title: "Recurring Cleaning",
    description:
      "Weekly, biweekly, triweekly, and monthly cleaning to keep your home looking its best.",
  },
  {
    number: "03",
    title: "Deep Cleaning",
    description:
      "A detailed top-to-bottom cleaning for kitchens, bathrooms, living spaces, and more.",
  },
  {
    number: "04",
    title: "Move-In / Move-Out",
    description:
      "Detailed cleaning to help prepare your home for its next chapter.",
  },
  {
    number: "05",
    title: "Commercial Cleaning",
    description:
      "Dependable cleaning solutions for offices and professional spaces.",
  },
  {
    number: "06",
    title: "Rental & Airbnb",
    description:
      "Reliable cleaning and turnover services for rental properties.",
  },
];

const serviceAreas = [
  "Mesa",
  "Gilbert",
  "Chandler",
  "Tempe",
  "Queen Creek",
  "Phoenix",
  "Scottsdale",
];

export default function Home() {
  return (
    <main>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Locally Owned. Proudly Serving the East Valley.</span>
          <div className="topbar-right">
            <span>★★★★★ 5.0 Google Rating</span>
            <a href="tel:4803108040">(480) 310-8040</a>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="header">
        <div className="container header-inner">
          <a href="#home" className="brand">
            <Image
              src="/images/tc-cleaning-logo.png"
              alt="TC Cleaning Services AZ LLC"
              width={260}
              height={110}
              priority
              className="brand-logo"
            />
          </a>

          <nav className="navigation">
            <a href="#home">Home</a>
            <a href="#services">Services</a>
            <a href="#about">About Us</a>
            <a href="#gallery">Our Team</a>
            <a href="#contact">Contact</a>
          </nav>

          <a href="#contact" className="button button-green header-button">
            Get a Free Quote <span>→</span>
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              PROFESSIONAL CLEANING SERVICES
            </div>

            <h1>
              A Cleaner Home.
              <br />
              <span>A Better Life.</span>
            </h1>

            <p className="hero-description">
              Enjoy coming home to a clean, comfortable space.
              TC Cleaning Services AZ LLC provides dependable,
              detailed cleaning throughout Mesa and the East Valley.
            </p>

            <div className="hero-buttons">
              <a href="tel:4803108040" className="button button-blue">
                Call (480) 310-8040
              </a>
              <a href="#contact" className="button button-outline">
                Request a Quote →
              </a>
            </div>

            <div className="hero-rating">
              <span className="stars">★★★★★</span>
              <div>
                <strong>5.0 Google Rating</strong>
                <small>Trusted by our local customers</small>
              </div>
            </div>
          </div>

          <div className="hero-image-wrap">
            <div className="hero-image">
              <Image
                src="/images/branded-truck.jpg"
                alt="TC Cleaning branded service truck in Arizona"
                fill
                priority
                sizes="(max-width: 850px) 100vw, 50vw"
              />
            </div>
            <div className="image-caption">
              <span className="caption-dot" />
              LOCALLY OWNED. PROFESSIONALLY CLEANED.
            </div>
            <div className="hero-image-accent" />
          </div>
        </div>
      </section>
<PriceCalculator />
      {/* TRUST BAR */}
      <section className="trust-section">
        <div className="container trust-grid">
          <div className="trust-item">
            <span className="trust-icon">✓</span>
            <div>
              <strong>Reliable Service</strong>
              <small>Dependable appointments</small>
            </div>
          </div>

          <div className="trust-item">
            <span className="trust-icon">✦</span>
            <div>
              <strong>Attention to Detail</strong>
              <small>We care about the little things</small>
            </div>
          </div>

          <div className="trust-item">
            <span className="trust-icon">★</span>
            <div>
              <strong>5-Star Service</strong>
              <small>Rated 5.0 on Google</small>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services-section section-padding" id="services">
        <div className="container">
          <div className="section-heading centered">
            <span className="section-label">WHAT WE DO</span>
            <h2>Cleaning Services Made Simple.</h2>
            <p>
              Whether you need a one-time deep clean or ongoing
              home maintenance, we have a cleaning solution for you.
            </p>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <article className="service-card" key={service.number}>
                <span className="service-number">{service.number}</span>
                <div className="service-divider" />
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a href="#contact" className="service-link">
                  Get a Quote <span>→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section section-padding" id="about">
        <div className="container about-grid">
          <div className="about-image-wrap">
            <div className="about-image">
              <Image
                src="/images/team-truck.jpg"
                alt="TC Cleaning team with their company truck"
                fill
                sizes="(max-width: 850px) 100vw, 50vw"
              />
            </div>
            <div className="about-image-label">
              <strong>TC Cleaning</strong>
              <span>Services AZ LLC</span>
            </div>
          </div>

          <div className="about-content">
            <span className="section-label">ABOUT TC CLEANING</span>
            <h2>
              More Than Cleaning.
              <br />
              <span>It's Peace of Mind.</span>
            </h2>

            <p>
              At TC Cleaning Services AZ LLC, we believe a clean
              space makes everyday life better. Our goal is to
              provide dependable service, detailed work, and
              an experience you can feel good about.
            </p>

            <p>
              From recurring home maintenance to detailed deep
              cleaning, we take pride in helping our customers
              enjoy a cleaner, more comfortable space.
            </p>

            <div className="about-points">
              <div>✓ Personalized cleaning services</div>
              <div>✓ Consistent attention to detail</div>
              <div>✓ Proudly serving the East Valley</div>
            </div>

            <a href="#contact" className="button button-blue">
              Work With Us →
            </a>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="gallery-section section-padding" id="gallery">
        <div className="container">
          <div className="section-heading centered">
            <span className="section-label">MEET TC CLEANING</span>
            <h2>A Local Team You Can Count On.</h2>
            <p>
              Proud to represent our business and serve our Arizona community.
            </p>
          </div>

          <div className="gallery-grid">
            <div className="gallery-card gallery-large">
              <Image
                src="/images/team-truck.jpg"
                alt="TC Cleaning team and company truck"
                fill
                sizes="(max-width: 700px) 100vw, 60vw"
              />
            </div>

            <div className="gallery-card gallery-small">
              <Image
                src="/images/branded-truck.jpg"
                alt="TC Cleaning company truck in Arizona"
                fill
                sizes="(max-width: 700px) 100vw, 40vw"
              />
            </div>
          </div>
        </div>
      </section>
<GoogleReviews />
      {/* SERVICE AREA */}
      <section className="area-section section-padding">
        <div className="container">
          <div className="section-heading centered">
            <span className="section-label">WHERE WE WORK</span>
            <h2>Proudly Serving the East Valley.</h2>
            <p>
              Professional cleaning services throughout the
              greater Phoenix metropolitan area.
            </p>
          </div>

          <div className="area-list">
            {serviceAreas.map((area) => (
              <span className="area-pill" key={area}>
                <span>✓</span> {area}, AZ
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact-section" id="contact">
        <div className="container contact-inner">
          <div>
            <span className="section-label light-label">
              LET'S GET STARTED
            </span>
            <h2>Ready for a Cleaner Space?</h2>
            <p>
              Tell us about your cleaning needs. We'd love to
              help you find the right service for your home or business.
            </p>
          </div>

          <div className="contact-actions">
            <a href="tel:4803108040" className="button button-green">
              Call (480) 310-8040
            </a>
            <a
              href="mailto:tc.cleaningaz@gmail.com?subject=Cleaning%20Quote%20Request"
              className="button button-white"
            >
              Email Us for a Quote
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <h3>TC Cleaning</h3>
            <span className="footer-subtitle">SERVICES AZ LLC</span>
            <p>
              A cleaner home. A better life.
              <br />
              Proudly serving Mesa and the East Valley.
            </p>
          </div>

          <div className="footer-links">
            <strong>QUICK LINKS</strong>
            <a href="#home">Home</a>
            <a href="#services">Our Services</a>
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-links">
            <strong>GET IN TOUCH</strong>
            <a href="tel:4803108040">(480) 310-8040</a>
            <a href="mailto:tc.cleaningaz@gmail.com">
              tc.cleaningaz@gmail.com
            </a>
            <span>Mesa, Arizona</span>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>© 2026 TC Cleaning Services AZ LLC. All rights reserved.</span>
          <span>Locally Owned · East Valley, Arizona</span>
        </div>
      </footer>
    </main>
  );
}
