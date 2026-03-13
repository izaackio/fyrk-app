export type LandingAnalyticsData = Record<string, string | number | boolean | null>;

interface VercelAnalyticsEventPayload {
  name: string;
  data?: LandingAnalyticsData;
}

type VercelAnalyticsTracker = (type: "event", payload: VercelAnalyticsEventPayload) => void;

interface VercelWindow extends Window {
  va?: VercelAnalyticsTracker;
}

export function trackLandingEvent(name: string, data?: LandingAnalyticsData): void {
  if (typeof window === "undefined") {
    return;
  }

  const analytics = (window as VercelWindow).va;

  if (typeof analytics !== "function") {
    return;
  }

  const eventName = `landing_${name}`;
  analytics("event", data ? { name: eventName, data } : { name: eventName });
}
