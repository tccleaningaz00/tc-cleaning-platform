"use client";

import { useMemo, useState } from "react";
import styles from "./price-calculator.module.css";
import {
  ADD_ON_LABELS,
  PRICING_CONFIG,
  SERVICE_LABELS,
  type AddOnId,
  type ServiceType,
  type PropertyCondition,
} from "./lib/pricing-config";

const PHONE = "14803108040";

const DISCLAIMER =
  "All prices displayed are estimates based on the information provided and are not a final quote. Final pricing must be reviewed and confirmed by Cris after evaluating the property's condition, cleaning requirements, and any additional services requested. Submitting this form does not confirm an appointment.";

export default function PriceCalculator() {
  const [service, setService] = useState<ServiceType>("standard");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [squareFeet, setSquareFeet] = useState("1800");
  const [condition, setCondition] =
    useState<PropertyCondition>("average");
  const [zip, setZip] = useState("");
  const [addons, setAddons] = useState<AddOnId[]>([]);
  const [error, setError] = useState("");

  const estimate = useMemo(() => {
    const sqft = Number(squareFeet);

    if (!Number.isFinite(sqft) || sqft <= 0) return null;

    const rate = PRICING_CONFIG.crewHourRate[service];
    const bedroomHours = PRICING_CONFIG.bedrooms[bedrooms];
    const bathroomHours = PRICING_CONFIG.bathrooms[bathrooms];

    const sqftBand = PRICING_CONFIG.squareFeet.find(
      (band) => sqft <= band.max
    );
    const sqftHours = sqftBand?.hours ?? null;
    const multiplier =
      PRICING_CONFIG.conditionMultiplier[condition];

    const selectedAddOnPrices = addons.map(
      (id) => PRICING_CONFIG.addOnPrices[id]
    );

    const complete =
      PRICING_CONFIG.approvedForPublicDisplay &&
      rate !== null &&
      bedroomHours !== null &&
      bathroomHours !== null &&
      sqftHours !== null &&
      multiplier !== null &&
      PRICING_CONFIG.upperRangeBufferPercent !== null &&
      selectedAddOnPrices.every((price) => price !== null);

    if (
      !complete ||
      !bedroomHours ||
      !bathroomHours ||
      !sqftHours ||
      multiplier === null ||
      rate === null
    ) {
      return null;
    }

    const minHours = Math.max(
      bedroomHours[0],
      bathroomHours[0],
      sqftHours[0]
    );

    const maxHours = Math.max(
      bedroomHours[1],
      bathroomHours[1],
      sqftHours[1]
    );

    const addonTotal = selectedAddOnPrices.reduce(
      (total, price) => total + (price ?? 0),
      0
    );

    const minPrice =
      minHours * rate * multiplier + addonTotal;

    const maxPrice =
      maxHours *
        rate *
        multiplier *
        (1 + PRICING_CONFIG.upperRangeBufferPercent! / 100) +
      addonTotal;

    const round = (value: number) =>
      Math.ceil(value / PRICING_CONFIG.roundUpTo) *
      PRICING_CONFIG.roundUpTo;

    return {
      min: round(minPrice),
      max: round(maxPrice),
      hours: [minHours, maxHours],
    };
  }, [service, bedrooms, bathrooms, squareFeet, condition, addons]);

  function toggleAddon(id: AddOnId) {
    setAddons((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function requestQuote() {
    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    setError("");

    const priceText = estimate
      ? `$${estimate.min}–$${estimate.max}`
      : "Personalized estimate requested";

    const message = [
      "Hello TC Cleaning! I would like a cleaning estimate.",
      "",
      `Service: ${SERVICE_LABELS[service]}`,
      `Bedrooms: ${bedrooms}`,
      `Bathrooms: ${bathrooms}`,
      `Square footage: ${squareFeet}`,
      `Condition: ${condition}`,
      `ZIP code: ${zip}`,
      `Additional services: ${
        addons.length
          ? addons.map((id) => ADD_ON_LABELS[id]).join(", ")
          : "None"
      }`,
      `Estimated price: ${priceText}`,
      "",
      "I understand that the final price must be confirmed by Cris.",
    ].join("\n");

    window.location.href =
      `sms:${PHONE}?body=${encodeURIComponent(message)}`;
  }

  return (
    <section id="price-calculator" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>
            TRANSPARENT PRICING
          </span>

          <h2>Estimate Your Cleaning Price</h2>

          <p>
            Tell us a little about your home and discover
            an estimated cleaning price. No obligation.
          </p>
        </header>

        <div className={styles.card}>
          <div className={styles.grid}>
            <label className={styles.field}>
              Cleaning Service
              <select
                value={service}
                onChange={(e) =>
                  setService(e.target.value as ServiceType)
                }
              >
                {Object.entries(SERVICE_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className={styles.field}>
              Property Condition
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(
                    e.target.value as PropertyCondition
                  )
                }
              >
                <option value="light">Light — Well maintained</option>
                <option value="average">Average — Normal use</option>
                <option value="heavy">Heavy — Extra attention needed</option>
              </select>
            </label>

            <label className={styles.field}>
              Bedrooms
              <select
                value={bedrooms}
                onChange={(e) =>
                  setBedrooms(Number(e.target.value))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((number) => (
                  <option key={number} value={number}>
                    {number}
                    {number === 6 ? "+" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Bathrooms
              <select
                value={bathrooms}
                onChange={(e) =>
                  setBathrooms(Number(e.target.value))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((number) => (
                  <option key={number} value={number}>
                    {number}
                    {number === 6 ? "+" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Approximate Square Footage
              <input
                type="number"
                min="100"
                max="20000"
                value={squareFeet}
                onChange={(e) =>
                  setSquareFeet(e.target.value)
                }
                placeholder="Example: 1800"
              />
            </label>

            <label className={styles.field}>
              Property ZIP Code
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) =>
                  setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="Example: 85204"
              />
            </label>
          </div>

          <div className={styles.addons}>
            <h3>Additional Cleaning Services</h3>

            <div className={styles.addonGrid}>
              {(Object.entries(ADD_ON_LABELS) as [
                AddOnId,
                string
              ][]).map(([id, label]) => (
                <label key={id} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={addons.includes(id)}
                    onChange={() => toggleAddon(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.result}>
            <div>
              <span className={styles.resultLabel}>
                YOUR ESTIMATED PRICE
              </span>

              {estimate ? (
                <>
                  <strong className={styles.price}>
                    ${estimate.min.toLocaleString()} – $
                    {estimate.max.toLocaleString()}
                  </strong>

                  <p>
                    Estimated crew hours: {estimate.hours[0]}–
                    {estimate.hours[1]}
                  </p>
                </>
              ) : (
                <strong className={styles.pending}>
                  Request Your Personalized Estimate
                </strong>
              )}

              <p>
                {estimate
                  ? "Your final quote will be confirmed after review."
                  : "Our team will review your property details and prepare your estimate."}
              </p>
            </div>

            <button
              type="button"
              className={styles.button}
              onClick={requestQuote}
            >
              Request My Quote →
            </button>
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <p className={styles.disclaimer}>
            <strong>Important Pricing Disclaimer:</strong>{" "}
            {DISCLAIMER}
          </p>
        </div>
      </div>
    </section>
  );
}