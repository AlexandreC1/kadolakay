import { monitoringDataCollection } from "./lib/monitoring-privacy";
/** Monitoring is loaded only when a public DSN is deliberately configured. */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then(Sentry => {
    Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "production", tracesSampleRate: 0.1, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, dataCollection: monitoringDataCollection });
  });
}
export const onRouterTransitionStart = (...args: unknown[]) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs").then(Sentry => {
    // @ts-expect-error The monitoring SDK exposes a navigation hook with router-specific parameters.
    Sentry.captureRouterTransitionStart?.(...args);
  });
};
