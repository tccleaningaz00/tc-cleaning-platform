import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
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

      <section className={styles.socialSection} aria-labelledby="social-title">
        <Script
          src="https://www.instagram.com/embed.js"
          strategy="lazyOnload"
        />
        <div className={styles.socialIntro}>
          <span className={styles.eyebrow}>FOLLOW ALONG</span>
          <h2 id="social-title">A little more TC Cleaning.</h2>
          <p>See more of the people, homes, and care behind our work.</p>
        </div>

        <div className={styles.socialLayout}>
          <article className={styles.reelCard}>
            <div className={styles.socialCardHeading}>
              <span className={styles.socialBadge}>IG</span>
              <div>
                <strong>From our Instagram</strong>
                <span>@tccleaningaz · Featured Reel</span>
              </div>
            </div>
            <div className={styles.instagramEmbed}>
              <blockquote
                className="instagram-media"
                data-instgrm-permalink="https://www.instagram.com/reel/DeitvVfKt8u/"
                data-instgrm-version="14"
                style={{
                  background: "#fff",
                  border: 0,
                  borderRadius: 4,
                  boxShadow: "none",
                  margin: "0 auto",
                  maxWidth: 540,
                  minWidth: 326,
                  padding: 0,
                  width: "calc(100% - 2px)",
                }}
              >
                <a
                  href="https://www.instagram.com/reel/DeitvVfKt8u/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch this Reel on Instagram
                </a>
              </blockquote>
            </div>
            <a
              className={styles.reelFallback}
              href="https://www.instagram.com/reel/DeitvVfKt8u/"
              target="_blank"
              rel="noreferrer"
            >
              Open Reel on Instagram <span aria-hidden="true">↗</span>
            </a>
          </article>

          <aside className={styles.socialAside}>
            <h3>Find us on social</h3>
            <p>Follow along for new projects, helpful tips, and more from TC Cleaning.</p>
            <div className={styles.socialLinks}>
              <a
                className={styles.socialLink}
                href="https://www.instagram.com/tccleaningaz/"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow TC Cleaning on Instagram"
              >
                <span className={`${styles.socialBadge} ${styles.instagramBadge}`} aria-hidden="true">IG</span>
                <span><strong>Instagram</strong><small>@tccleaningaz</small></span>
                <b aria-hidden="true">↗</b>
              </a>
              <a
                className={styles.socialLink}
                href="https://www.tiktok.com/@crisrra_condado"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow Crisrra Condado on TikTok"
              >
                <span className={`${styles.socialBadge} ${styles.tiktokBadge}`} aria-hidden="true">♪</span>
                <span><strong>TikTok</strong><small>@crisrra_condado</small></span>
                <b aria-hidden="true">↗</b>
              </a>
              <a
                className={styles.socialLink}
                href="https://www.facebook.com/people/TC-Cleaning-Services-Az-LLC/61552028981970/"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow TC Cleaning Services AZ LLC on Facebook"
              >
                <span className={`${styles.socialBadge} ${styles.facebookBadge}`} aria-hidden="true">f</span>
                <span><strong>Facebook</strong><small>TC Cleaning Services AZ LLC</small></span>
                <b aria-hidden="true">↗</b>
              </a>
            </div>
          </aside>
        </div>
      </section>

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
