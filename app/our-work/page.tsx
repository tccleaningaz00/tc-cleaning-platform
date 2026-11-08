import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import OurWorkGallery from "../components/our-work-gallery";
import styles from "./our-work.module.css";

export const metadata: Metadata = {
  title: "Our Work | TC Cleaning Services AZ LLC",
  description:
    "Take a look at the home spaces TC Cleaning Services cares for across Mesa and the East Valley.",
};

export default function OurWorkPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="TC Cleaning home">
          <Image
            src="/images/tc-cleaning-logo.png"
            alt="TC Cleaning Services AZ LLC"
            width={260}
            height={110}
            priority
            className={styles.logo}
          />
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/#services">Services</Link>
          <Link href="/#about">About</Link>
          <Link href="/#contact" className={styles.navCta}>Get a quote <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><span /> A LITTLE LOOK INSIDE</span>
            <h1>Spaces we care for.<br /><em>Details that matter.</em></h1>
            <p>
              Every home is different. Here are a few of the spaces our team
              gets to care for across Mesa and the East Valley.
            </p>
            <Link className={styles.heroLink} href="/#contact">Let’s talk about your home <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.heroMark} aria-hidden="true">
            <span>TC</span>
            <small>CLEANING<br />SERVICES AZ LLC</small>
            <i />
          </div>
        </div>
        <div className={styles.heroBottom}>
          <span>MESA · EAST VALLEY · ARIZONA</span>
          <span>THOUGHTFUL CARE, ROOM BY ROOM</span>
        </div>
      </section>

      <OurWorkGallery />

      <section className={styles.contactBand}>
        <div>
          <span className={styles.eyebrow}>READY FOR A FRESH START?</span>
          <h2>Your home, cared for with intention.</h2>
        </div>
        <Link href="/#contact">Request a quote <span aria-hidden="true">→</span></Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/">TC Cleaning Services AZ LLC</Link>
        <span>Locally owned · Proudly serving the East Valley</span>
        <a href="tel:4803108040">(480) 310-8040</a>
      </footer>
    </main>
  );
}
