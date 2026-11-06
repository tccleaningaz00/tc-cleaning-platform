"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "../our-work/our-work.module.css";

const categories = ["Bathroom", "Kitchen", "Living Room", "Whole Home"] as const;
type Category = (typeof categories)[number];

type Photo = {
  src: string;
  alt: string;
  title: string;
  room: string;
};

const bathroomPhotos: Photo[] = [
  { src: "/images/our-work/bathroom-01.jpg", alt: "Bathroom floor and toilet detail", title: "A fresh bathroom detail", room: "Bath details" },
  { src: "/images/our-work/bathroom-02.jpg", alt: "Bathtub and shower surround", title: "Tub & shower care", room: "Tub & shower" },
  { src: "/images/our-work/bathroom-03.jpg", alt: "Bathroom vanity and sink area", title: "Vanity, sink & surfaces", room: "Vanity & sink" },
  { src: "/images/our-work/bathroom-04.jpg", alt: "Bathroom sink and countertop", title: "The little details", room: "Sink & surfaces" },
  { src: "/images/our-work/bathroom-05.jpg", alt: "Bathroom toilet and tile detail", title: "Care around every corner", room: "Bath details" },
];

const kitchenPhotos: Photo[] = [
  { src: "/images/our-work/kitchen-01.jpg", alt: "Kitchen floor behind the range before detailed floor care", title: "Behind the range", room: "Before" },
  { src: "/images/our-work/kitchen-02.jpg", alt: "Kitchen floor behind the range after detailed floor care", title: "Floor detail, refreshed", room: "After" },
  { src: "/images/our-work/kitchen-03.jpg", alt: "Electric cooktop before detailed cleaning", title: "A closer look at the cooktop", room: "Before" },
  { src: "/images/our-work/kitchen-04.jpg", alt: "Electric cooktop after detailed cleaning", title: "Cooktop after detailed care", room: "After" },
  { src: "/images/our-work/kitchen-05.jpg", alt: "Close-up of a kitchen appliance exterior", title: "Appliance exterior detail", room: "Kitchen detail" },
];

const galleryPhotos: Record<Category, Photo[]> = {
  Bathroom: bathroomPhotos,
  Kitchen: kitchenPhotos,
  "Living Room": [],
  "Whole Home": [],
};

export default function OurWorkGallery() {
  const [activeCategory, setActiveCategory] = useState<Category>("Bathroom");
  const activePhotos = galleryPhotos[activeCategory];

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
            {galleryPhotos[category].length > 0 && (
              <span className={styles.filterCount}>
                {String(galleryPhotos[category].length).padStart(2, "0")}
              </span>
            )}
          </button>
        ))}
      </div>

      {activePhotos.length > 0 ? (
        <div className={styles.photoGrid}>
          {activePhotos.map((photo, index) => (
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
