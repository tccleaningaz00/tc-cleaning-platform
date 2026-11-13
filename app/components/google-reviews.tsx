
import styles from "./google-reviews.module.css";

const googleReviews = [
  {
    name: "Denetria Nelson",
    text: `I cannot say enough great things about TC cleaning service! Cris and her team showed up right on time, was incredibly respectful and professional, and went above and beyond every expectation. This wasn’t just a basic cleaning—it was a true deep clean. Every corner, every surface, and every detail was spotless.

I am very particular when it comes to cleaning, and I can honestly say she checked every single box. Their attention to detail was incredible. Not only was the house sparkling clean, but she also added thoughtful little touches that made such a difference—beautifully folded hand towels in the bathrooms, cute details with the toilet paper and those extra finishing touches that make your home feel cared for and special.

You can tell she takes pride in her work, and it shows in every room. My home felt clean, fresh, and welcoming.

If you’re looking for someone reliable, thorough, trustworthy, and genuinely excellent at what they do, look no further. This is exactly the kind of house cleaning company everyone hopes to find.`,
  },
  {
    name: "Crisia Tolentino",
    text: `Hands down the best deep cleaning service I’ve ever experienced. As soon as they arrived they got to work and took such great care of my home. My house feels as if I just moved in. They were very professional and I will continue to use them for recurring cleaning services. Reasonably priced for all that they do too!`,
  },
  {
    name: "Tracy D",
    text: `I started with a deep clean and am now doing monthly cleanings. TC cleaning has been wonderful to work with. They show up on time, do a great job, my house looks and feels so much better! Highly recommend`,
  },
  {
    name: "Karl Mueller",
    text: `Chris showed up bright and early on time and restored my 23 year old shower to new. I was really impressed because I had spent hours trying to do it my self and then realized I needed a professional. Good communication, friendly, knowledgeable, affordable, and exactly what I was looking for.`,
  },
  {
    name: "Nick",
    text: `Cris and her team at TC Cleaning services are absolutely amazing. They went above and beyond in every room, and the house looks incredible. Honestly, seeing the results really showed us how much our prior cleaner was missing. The attention to detail is night and day—I can’t recommend them enough! Will definitely be having them back again and foe the foresable future! Very trustworthy and also great communication for how they work and what they do!!`,
  },
];

const googleMapsUrl =
  "https://maps.app.goo.gl/mL5wTcbH1vq1e77B7?g_st=ac";

export default function GoogleReviews() {
  return (
    <section className={styles.section} id="reviews">
      <div className={styles.container}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>CUSTOMER EXPERIENCES</span>
          <h2>Kind Words From Our Customers.</h2>
          <p>
            We’re proud of the trust our customers place in
            TC Cleaning Services AZ LLC.
          </p>
          <div className={styles.rating}>
            <span aria-label="4.9 out of 5 stars">4.9 ★</span>
            <strong>Google rating · 38 reviews</strong>
          </div>
        </div>

        <div className={styles.profileCard}>
          <span className={styles.profileIcon} aria-hidden="true">G</span>
          <div>
            <strong>Visit TC Cleaning on Google</strong>
            <p>See the latest customer reviews, business photos, and profile updates.</p>
          </div>
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Open the TC Cleaning Google Business Profile">
            View profile <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className={styles.grid}>
          {googleReviews.map((review, index) => (
            <article className={styles.card} key={review.name}>
              <div className={styles.cardTop}>
                <div className={styles.avatar}>
                  {review.name.charAt(0)}
                </div>
                <div className={styles.customer}>
                  <strong>{review.name}</strong>
                  <span>Customer review · Google</span>
                </div>
                <span className={styles.stars}>★★★★★</span>
              </div>

              <p className={styles.reviewText}>{review.text}</p>
              <span className={styles.reviewNumber}>
                CUSTOMER REVIEW 0{index + 1}
              </span>
            </article>
          ))}
        </div>

        <div className={styles.mapCard}>
          <div className={styles.mapHeading}>
            <span className={styles.eyebrow}>OUR GOOGLE BUSINESS PROFILE</span>
            <h3>Find TC Cleaning on Google.</h3>
            <p>Explore our profile, photos, reviews, and location on Google Maps.</p>
          </div>
          <iframe
            className={styles.mapFrame}
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.9273836437515!2d-111.7908659!3d33.42513749999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2c65d9dc3127852b%3A0x11cf1651d4a77648!2sTC%20Cleaning%20Services%20AZ%20LLC!5e0!3m2!1sen!2sus!4v1794549512107!5m2!1sen!2sus"
            width="600"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="TC Cleaning Services AZ LLC on Google Maps"
          />
        </div>

        <div className={styles.footer}>
          <p>Want to learn more about our business?</p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.googleButton}
          >
            View TC Cleaning on Google <span>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
