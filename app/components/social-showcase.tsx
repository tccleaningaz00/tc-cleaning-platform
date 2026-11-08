import Script from "next/script";
import styles from "../our-work/our-work.module.css";

const instagramProfile = "https://www.instagram.com/tccleaningaz/";
const featuredReel = "https://www.instagram.com/reel/DeitvVfKt8u/";

export default function SocialShowcase() {
  return (
    <section className={styles.socialSection} id="social" aria-labelledby="social-title">
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
      />
      <div className={styles.socialIntro}>
        <span className={styles.eyebrow}>FOLLOW ALONG</span>
        <h2 id="social-title">More from TC Cleaning.</h2>
        <p>Recent Instagram posts and Reels, plus all the places to follow our work.</p>
      </div>

      <div className={styles.socialLayout}>
        <article className={styles.reelCard}>
          <div className={styles.socialCardHeading}>
            <span className={`${styles.socialBadge} ${styles.instagramBadge}`}>IG</span>
            <div>
              <strong>Latest from Instagram</strong>
              <span>@tccleaningaz · Recent posts &amp; Reels</span>
            </div>
          </div>
          <div className={styles.instagramEmbed}>
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={instagramProfile}
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
              <a href={instagramProfile} target="_blank" rel="noreferrer">
                View TC Cleaning on Instagram
              </a>
            </blockquote>
          </div>
          <a
            className={styles.reelFallback}
            href={featuredReel}
            target="_blank"
            rel="noreferrer"
          >
            Watch the featured Reel <span aria-hidden="true">↗</span>
          </a>
        </article>

        <aside className={styles.socialAside}>
          <h3>Find us on social</h3>
          <p>Follow along for new projects, helpful tips, and more from TC Cleaning.</p>
          <div className={styles.socialLinks}>
            <a
              className={styles.socialLink}
              href={instagramProfile}
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
  );
}
