export type TrackedEvent =
  | "page_view"
  | "quote_form_navigation"
  | "quote_form_start"
  | "quote_form_error"
  | "generate_lead"
  | "phone_click"
  | "email_click"
  | "social_profile_click"
  | "google_business_profile_click";

type EventParameters = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    tcAnalyticsInitialized?: boolean;
  }
}

export function trackAnalyticsEvent(
  event: TrackedEvent,
  parameters: EventParameters = {}
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, parameters);
}
