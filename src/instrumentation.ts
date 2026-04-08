/**
 * Next.js instrumentation hook — runs once at server startup in every runtime
 * (Node.js + Edge). We use it to initialize Sentry. The Sentry SDK no-ops
 * gracefully when SENTRY_DSN is not set, so local dev needs zero setup.
 *
 * Re-exports `onRequestError` so unhandled server errors are reported to Sentry.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      // PII off by default; checkout/auth flows might carry email — opt in deliberately later if needed.
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
