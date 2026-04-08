/**
 * Browser-side Sentry init. Loaded automatically by Next.js when present.
 * No-ops when NEXT_PUBLIC_SENTRY_DSN is unset.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = (...args: unknown[]) =>
  // @ts-expect-error — Sentry exposes this hook for App Router navigation tracing.
  Sentry.captureRouterTransitionStart?.(...args);
