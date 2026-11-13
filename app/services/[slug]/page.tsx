import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cleaningServices, getService, serviceAreas } from "../../lib/services";
import styles from "../services.module.css";

const baseUrl = "https://www.tccleaningaz.com";

export function generateStaticParams() {
  return cleaningServices.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Cleaning Services" };

  return {
    title: service.title,
    description: service.description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: `${service.name} | TC Cleaning Services AZ LLC`,
      description: service.description,
      url: `/services/${service.slug}`,
      type: "article",
      images: [{ url: "/images/branded-truck.jpg", alt: "TC Cleaning Services AZ LLC" }],
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    areaServed: serviceAreas.map((name) => ({ "@type": "City", name, containedInPlace: { "@type": "State", name: "Arizona" } })),
    provider: {
      "@type": "Organization",
      name: "TC Cleaning Services AZ LLC",
      url: `${baseUrl}/`,
      telephone: "+1-480-310-8040",
      logo: `${baseUrl}/images/tc-cleaning-logo.png`,
    },
    url: `${baseUrl}/services/${service.slug}`,
  };

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="TC Cleaning home">
          <span>TC CLEANING</span>
          <small>SERVICES AZ LLC · (480) 310-8040</small>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/services">All Services</Link>
          <Link href="/our-work">Our Work</Link>
          <Link className={styles.navCta} href="/#price-calculator">Get a Free Quote</Link>
        </nav>
      </header>

      <section className={styles.detailHero}>
        <div className={styles.breadcrumb}><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/services">Services</Link><span aria-hidden="true">/</span><span>{service.name}</span></div>
        <p className={styles.eyebrow}>MESA &amp; EAST VALLEY CLEANING</p>
        <h1>{service.title}</h1>
        <p>{service.intro}</p>
        <p className={styles.bestFor}>A GOOD FIT FOR</p>
        <p className={styles.detailBestFor}>{service.bestFor}</p>
        <Link href="/#price-calculator" className={styles.primaryCta}>Request a personalized estimate <span aria-hidden="true">→</span></Link>
      </section>

      <div className={styles.detailBody}>
        <section className={styles.detailSection}>
          <p className={styles.eyebrow}>PLAN YOUR VISIT</p>
          <h2>What we review for your estimate</h2>
          <p>The right scope depends on your property and priorities. Include the details that will help us understand the work you are requesting:</p>
          <ul className={styles.checkList}>{service.planningPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </section>

        <section className={styles.detailSection}>
          <p className={styles.eyebrow}>A CLEAR PROCESS</p>
          <h2>From quote request to confirmed service</h2>
          <ol className={styles.steps}>{service.process.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>

        <section className={styles.detailSection}>
          <p className={styles.eyebrow}>COMMON QUESTIONS</p>
          <h2>About {service.shortName.toLowerCase()}</h2>
          <div className={styles.faqs}>{service.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
        </section>

        <section className={styles.areaCard}>
          <h2>Serving Mesa and the East Valley</h2>
          <p>TC Cleaning Services AZ LLC serves homes and businesses in Mesa, Gilbert, Chandler, Tempe, Queen Creek, Phoenix, and Scottsdale. Contact us to confirm availability for your address.</p>
          <Link href="/services">Explore all cleaning services <span aria-hidden="true">→</span></Link>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>TC Cleaning Services AZ LLC · Mesa, Arizona · (480) 310-8040</span>
        <Link href="/">Visit the main website</Link>
      </footer>
    </main>
  );
}
