import * as amplitude from "@amplitude/analytics-browser";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY as
  | string
  | undefined;

let isInitialized = false;

export function initAnalytics() {
  console.log("[Amplitude] API Key present:", !!AMPLITUDE_API_KEY);
  console.log("[Amplitude] API Key starts with:", AMPLITUDE_API_KEY?.substring(0, 8));

  if (!AMPLITUDE_API_KEY) {
    console.warn("[Amplitude] API key not configured");
    return;
  }

  if (isInitialized) {
    console.log("[Amplitude] Already initialized");
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
  console.log("[Amplitude] Initialized successfully");
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
