import Script from "next/script";
import styles from "../our-work/our-work.module.css";

const instagramProfile = "https://www.instagram.com/tccleaningaz/";
const featuredReel = "https://www.instagram.com/reel/DeitvVfKt8u/";
const tiktokProfile = "https://www.tiktok.com/@crisrra_condado";
const facebookPage = "https://www.facebook.com/people/TC-Cleaning-Services-Az-LLC/61552028981970/";

export default function SocialShowcase() {
  return (
    <section className={styles.socialSection} id="social" aria-labelledby="social-title">
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
      />
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
      <div className={styles.socialIntro}>
        <span className={styles.eyebrow}>FOLLOW ALONG</span>
        <h2 id="social-title">More from TC Cleaning.</h2>
        <p>Recent work, videos, and updates from TC Cleaning across Instagram, TikTok, and Facebook.</p>
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
              href={tiktokProfile}
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
              href={facebookPage}
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

      <div className={styles.socialFeedGrid} aria-label="TC Cleaning social media feeds">
        <article className={styles.reelCard}>
          <div className={styles.socialCardHeading}>
            <span className={`${styles.socialBadge} ${styles.tiktokBadge}`} aria-hidden="true">♪</span>
            <div><strong>Latest from TikTok</strong><span>@crisrra_condado · Videos &amp; cleaning tips</span></div>
          </div>
          <div className={styles.tiktokEmbed}>
            <blockquote className="tiktok-embed" cite={tiktokProfile} data-unique-id="crisrra_condado" data-embed-type="creator" style={{ maxWidth: 720, minWidth: 288, margin: "0 auto" }}>
              <section><a target="_blank" rel="noreferrer" href={tiktokProfile}>@crisrra_condado</a></section>
            </blockquote>
          </div>
          <a className={styles.reelFallback} href={tiktokProfile} target="_blank" rel="noreferrer">Watch TC Cleaning on TikTok <span aria-hidden="true">↗</span></a>
        </article>

        <article className={styles.reelCard}>
          <div className={styles.socialCardHeading}>
            <span className={`${styles.socialBadge} ${styles.facebookBadge}`} aria-hidden="true">f</span>
            <div><strong>Latest from Facebook</strong><span>TC Cleaning Services AZ LLC · Page updates</span></div>
          </div>
          <div className={styles.facebookEmbed}>
            <iframe
              title="TC Cleaning Services AZ LLC Facebook page and recent posts"
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(facebookPage)}&tabs=timeline&width=500&height=650&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`}
              width="500"
              height="650"
              style={{ border: 0, overflow: "hidden" }}
              scrolling="no"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              loading="lazy"
            />
          </div>
          <a className={styles.reelFallback} href={facebookPage} target="_blank" rel="noreferrer">Visit TC Cleaning on Facebook <span aria-hidden="true">↗</span></a>
        </article>
      </div>
    </section>
  );
}
