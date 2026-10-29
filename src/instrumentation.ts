import { monitoringPrivacyOptions } from "./lib/monitoring-privacy";
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, ...monitoringPrivacyOptions });
  } catch { console.warn("MONITORING_INIT_FAILED"); }
}
export async function onRequestError(...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    return Sentry.captureRequestError(...args);
  } catch { console.warn("MONITORING_CAPTURE_FAILED"); }
}
