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

const DISCLAIMER =
  "All prices displayed are estimates based on the information provided and are not a final quote. Final pricing must be reviewed and confirmed by Cris after evaluating the property's condition, cleaning requirements, and any additional services requested. Submitting this form does not confirm an appointment.";

export default function PriceCalculator() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");

  const [service, setService] = useState<ServiceType>("standard");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [squareFeet, setSquareFeet] = useState("1800");
  const [condition, setCondition] =
    useState<PropertyCondition>("average");
  const [zip, setZip] = useState("");
  const [addons, setAddons] = useState<AddOnId[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const multiplier = PRICING_CONFIG.conditionMultiplier[condition];

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

    const minPrice = minHours * rate * multiplier + addonTotal;
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

  async function requestQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!addressLine1.trim() || !city.trim()) {
      setError("Please enter the property's street address and city.");
      return;
    }

    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    const sqft = Number(squareFeet);
    if (!Number.isInteger(sqft) || sqft < 100 || sqft > 20000) {
      setError("Please enter square footage between 100 and 20,000.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          email: email.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          zip,
          service,
          bedrooms,
          bathrooms,
          squareFeet: sqft,
          condition,
          addons,
        }),
      });

      const result = (await response.json()) as {
  success?: boolean;
  error?: string;
  estimateId?: string;
};

if (!response.ok || !result.success) {
  throw new Error(
    result.error || "We could not submit your request. Please try again."
  );
}

      setSuccess(
        "Thank you! Your quote request has been received. Cris will review your information and follow up. This request does not confirm an appointment."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="price-calculator" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>TRANSPARENT PRICING</span>
          <h2>Estimate Your Cleaning Price</h2>
          <p>
            Tell us a little about your home and request a personalized
            cleaning estimate. No obligation.
          </p>
        </header>

        <form className={styles.card} onSubmit={requestQuote}>
          <h3>Contact Information</h3>

          <div className={styles.grid}>
            <label className={styles.field}>
              First Name *
              <input
                required
                maxLength={60}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </label>

            <label className={styles.field}>
              Last Name *
              <input
                required
                maxLength={60}
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </label>

            <label className={styles.field}>
              Phone Number *
              <input
                required
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(480) 555-1234"
              />
            </label>

            <label className={styles.field}>
              Email Address (Optional)
              <input
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className={styles.field}>
              Street Address *
              <input
                required
                maxLength={120}
                autoComplete="address-line1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="123 Main Street"
              />
            </label>

            <label className={styles.field}>
              Apartment / Unit (Optional)
              <input
                maxLength={60}
                autoComplete="address-line2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apartment or unit number"
              />
            </label>

            <label className={styles.field}>
              City *
              <input
                required
                maxLength={60}
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mesa"
              />
            </label>

            <label className={styles.field}>
              ZIP Code *
              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(e) =>
                  setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="85204"
              />
            </label>
          </div>

          <div className={styles.addons}>
            <h3>Property & Cleaning Details</h3>

            <div className={styles.grid}>
              <label className={styles.field}>
                Cleaning Service
                <select
                  value={service}
                  onChange={(e) =>
                    setService(e.target.value as ServiceType)
                  }
                >
                  {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                Property Condition
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as PropertyCondition)
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
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((number) => (
                    <option key={number} value={number}>
                      {number}{number === 6 ? "+" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                Bathrooms
                <select
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((number) => (
                    <option key={number} value={number}>
                      {number}{number === 6 ? "+" : ""}
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
                  onChange={(e) => setSquareFeet(e.target.value)}
                  placeholder="Example: 1800"
                />
              </label>
            </div>
          </div>

          <div className={styles.addons}>
            <h3>Additional Cleaning Services</h3>

            <div className={styles.addonGrid}>
              {(Object.entries(ADD_ON_LABELS) as [AddOnId, string][]).map(
                ([id, label]) => (
                  <label key={id} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={addons.includes(id)}
                      onChange={() => toggleAddon(id)}
                    />
                    {label}
                  </label>
                )
              )}
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
              type="submit"
              className={styles.button}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Request My Quote →"}
            </button>
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          {success && (
            <p role="status" className={styles.note}>
              {success}
            </p>
          )}

          <p className={styles.disclaimer}>
            <strong>Important Pricing Disclaimer:</strong> {DISCLAIMER}
          </p>
        </form>
      </div>
    </section>
  );
}