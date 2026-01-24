import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY as
  | string
  | undefined;

let isInitialized = false;

export function initAnalytics() {
  if (!AMPLITUDE_API_KEY || isInitialized) {
    return;
  }

  amplitude.initAll(AMPLITUDE_API_KEY, {
    serverZone: "EU",
    analytics: {
      autocapture: true,
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
