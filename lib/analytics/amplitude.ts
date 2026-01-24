import * as amplitude from "@amplitude/analytics-browser";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY as
  | string
  | undefined;

let isInitialized = false;

export function initAnalytics() {
  if (!AMPLITUDE_API_KEY) {
    console.warn("Amplitude API key not configured");
    return;
  }

  if (isInitialized) {
    return;
  }

  amplitude.init(AMPLITUDE_API_KEY, {
    autocapture: {
      attribution: true,
      pageViews: true,
      sessions: true,
      elementInteractions: true,
      formInteractions: true,
    },
  });

  isInitialized = true;
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  if (!isInitialized) {
    return;
  }
  amplitude.track(eventName, properties);
}
