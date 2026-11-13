import type { Metadata } from "next";
import Link from "next/link";
import { cleaningServices, serviceAreas } from "../lib/services";
import styles from "./services.module.css";

export const metadata: Metadata = {
  title: "Cleaning Services in Mesa & the East Valley",
  description:
    "Explore residential, recurring, deep, move-in/move-out, commercial, and rental turnover cleaning from TC Cleaning Services AZ LLC in Mesa and the East Valley.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Cleaning Services | TC Cleaning Services AZ LLC",
    description:
      "Find the right home or business cleaning service in Mesa and Arizona's East Valley.",
    url: "/services",
    type: "website",
  },
};

export default function ServicesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="TC Cleaning home">
          <span>TC CLEANING</span>
          <small>SERVICES AZ LLC · (480) 310-8040</small>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/our-work">Our Work</Link>
          <Link href="/articles">Cleaning Tips</Link>
          <Link className={styles.navCta} href="/#price-calculator">Get a Free Quote</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>MESA &amp; EAST VALLEY, ARIZONA</p>
        <h1>Cleaning services that fit your space and schedule.</h1>
        <p>
          TC Cleaning Services AZ LLC offers residential and commercial cleaning
          across Mesa and nearby communities. Explore the service options, then
          tell us about your property for a personalized estimate.
        </p>
        <Link href="/#price-calculator" className={styles.primaryCta}>Request a free quote <span aria-hidden="true">→</span></Link>
      </section>

      <section className={styles.content} aria-labelledby="service-options">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>EXPLORE OUR SERVICES</p>
          <h2 id="service-options">Choose the service you need</h2>
          <p>Every estimate is prepared around your property, requested scope, and preferred timing.</p>
        </div>
        <div className={styles.grid}>
          {cleaningServices.map((service, index) => (
            <article className={styles.card} key={service.slug}>
              <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
              <h3><Link href={`/services/${service.slug}`}>{service.name}</Link></h3>
              <p>{service.intro}</p>
              <span className={styles.bestFor}>A GOOD FIT FOR</span>
              <p className={styles.cardDetail}>{service.bestFor}</p>
              <Link className={styles.textLink} href={`/services/${service.slug}`}>Service details <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.area}>
        <p className={styles.eyebrow}>LOCAL SERVICE AREA</p>
        <h2>Serving Mesa and surrounding communities</h2>
        <p>Ask us about availability for your address in these Arizona communities:</p>
        <ul>{serviceAreas.map((city) => <li key={city}>{city}, AZ</li>)}</ul>
      </section>

      <footer className={styles.footer}>
        <span>TC Cleaning Services AZ LLC · Mesa, Arizona · (480) 310-8040</span>
        <Link href="/">Visit the main website</Link>
      </footer>
    </main>
  );
}
