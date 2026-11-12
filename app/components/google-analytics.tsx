"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { trackAnalyticsEvent } from "../lib/analytics";
import styles from "./google-analytics.module.css";

const measurementId = "G-NX6PK72ETG";
const consentStorageKey = "tc-cleaning-analytics-consent";
type ConsentChoice = "granted" | "denied";
let volatileConsent: ConsentChoice | null = null;

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("tc-cleaning-consent-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("tc-cleaning-consent-change", callback);
  };
}

function getConsentSnapshot(): ConsentChoice | null {
  try {
    const saved = window.localStorage.getItem(consentStorageKey);
    return saved === "granted" || saved === "denied" ? saved : volatileConsent;
  } catch {
    return volatileConsent;
  }
}

function getServerConsentSnapshot(): null {
  return null;
}

function isPublicPage(pathname: string) {
  return !(
    pathname.startsWith("/manager") ||
    pathname.startsWith("/estimate/") ||
    pathname.startsWith("/api/")
  );
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;

  if (!window.tcAnalyticsInitialized) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.tcAnalytics = "true";
    document.head.appendChild(script);
    window.tcAnalyticsInitialized = true;
  }

  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function updateGoogleConsent(choice: ConsentChoice) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: choice,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const storedConsent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot
  );
  const consent = storedConsent;
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (consent !== "granted" || !isPublicPage(pathname)) return;

    loadGoogleAnalytics();
    trackAnalyticsEvent("page_view", {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
    });
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "denied") return;
    updateGoogleConsent("denied");
  }, [consent]);

  useEffect(() => {
    if (consent !== "granted" || !isPublicPage(pathname)) return;

    function trackPublicLink(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;

      if (link.href.startsWith("tel:")) {
        trackAnalyticsEvent("phone_click");
      } else if (link.href.startsWith("mailto:")) {
        trackAnalyticsEvent("email_click");
      } else {
        const linkUrl = new URL(link.href, window.location.href);
        if (linkUrl.pathname === "/" && linkUrl.hash === "#price-calculator") {
          trackAnalyticsEvent("quote_form_navigation");
        } else if (linkUrl.hostname === "maps.app.goo.gl") {
          trackAnalyticsEvent("google_business_profile_click");
        } else if (["instagram.com", "www.instagram.com", "tiktok.com", "www.tiktok.com", "facebook.com", "www.facebook.com"].includes(linkUrl.hostname)) {
          trackAnalyticsEvent("social_profile_click", {
            platform: linkUrl.hostname.includes("instagram")
              ? "instagram"
              : linkUrl.hostname.includes("tiktok")
                ? "tiktok"
                : "facebook",
          });
        }
      }
    }

    document.addEventListener("click", trackPublicLink, true);
    return () => document.removeEventListener("click", trackPublicLink, true);
  }, [consent, pathname]);

  function saveChoice(choice: ConsentChoice) {
    try {
      window.localStorage.setItem(consentStorageKey, choice);
    } catch {
      // Keep the choice in memory for this tab if browser storage is unavailable.
    }
    volatileConsent = choice;
    window.dispatchEvent(new Event("tc-cleaning-consent-change"));
    if (choice === "granted") loadGoogleAnalytics();
    else updateGoogleConsent("denied");
    setSettingsOpen(false);
  }

  if (consent === undefined || !isPublicPage(pathname)) return null;

  if (consent && !settingsOpen) {
    return (
      <button
        className={styles.settingsButton}
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open analytics privacy settings"
      >
        Privacy settings
      </button>
    );
  }

  return (
    <aside className={styles.banner} aria-label="Analytics privacy settings">
      <div className={styles.copy}>
        <strong>Help us improve the website</strong>
        <p>
          Optional Google Analytics helps us understand site visits, quote requests,
          and calls. Details entered in the quote form are not sent as analytics events.
        </p>
      </div>
      <div className={styles.actions}>
        <button className={styles.accept} type="button" onClick={() => saveChoice("granted")}>
          Allow analytics
        </button>
        <button className={styles.decline} type="button" onClick={() => saveChoice("denied")}>
          No thanks
        </button>
      </div>
    </aside>
  );
}
