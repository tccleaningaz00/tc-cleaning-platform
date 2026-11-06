"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "../our-work/our-work.module.css";

const categories = ["Bathroom", "Kitchen", "Living Room", "Whole Home"] as const;
type Category = (typeof categories)[number];

const bathroomPhotos = [
  { src: "/images/our-work/bathroom-01.jpg", alt: "Bathroom floor and toilet detail", title: "A fresh bathroom detail", room: "Bath details" },
  { src: "/images/our-work/bathroom-02.jpg", alt: "Bathtub and shower surround", title: "Tub & shower care", room: "Tub & shower" },
  { src: "/images/our-work/bathroom-03.jpg", alt: "Bathroom vanity and sink area", title: "Vanity, sink & surfaces", room: "Vanity & sink" },
  { src: "/images/our-work/bathroom-04.jpg", alt: "Bathroom sink and countertop", title: "The little details", room: "Sink & surfaces" },
  { src: "/images/our-work/bathroom-05.jpg", alt: "Bathroom toilet and tile detail", title: "Care around every corner", room: "Bath details" },
];

export default function OurWorkGallery() {
  const [activeCategory, setActiveCategory] = useState<Category>("Bathroom");

  return (
    <section className={styles.gallerySection} aria-labelledby="gallery-title">
      <div className={styles.sectionTop}>
        <div>
          <span className={styles.eyebrow}>ROOM BY ROOM</span>
          <h2 id="gallery-title">A closer look at our work.</h2>
        </div>
        <p>Browse the spaces we care for. Choose a room to explore.</p>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter photos by room">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`${styles.filter} ${activeCategory === category ? styles.filterActive : ""}`}
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            {category}
            {category === "Bathroom" && <span className={styles.filterCount}>05</span>}
          </button>
        ))}
      </div>

      {activeCategory === "Bathroom" ? (
        <div className={styles.photoGrid}>
          {bathroomPhotos.map((photo, index) => (
            <article className={styles.photoCard} key={photo.src}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 760px) 50vw, 33vw"
                className={styles.photoImage}
                priority={index === 0}
              />
              <div className={styles.photoScrim} />
              <div className={styles.photoCaption}>
                <span>{photo.room}</span>
                <strong>{photo.title}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">✦</span>
          <h3>{activeCategory}</h3>
          <p>We’re putting this part of the gallery together. Check back soon for a look at these spaces.</p>
          <Link href="/#contact">Ask us about your home <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </section>
  );
}
