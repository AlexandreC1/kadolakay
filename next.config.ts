import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Security headers applied to every response.
// CSP intentionally permissive enough for Next.js (inline styles for hydration,
// Stripe.js, PayPal SDK, Google fonts, R2 images, OAuth avatars). Tighten per route as needed.
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.r2.cloudflarestorage.com https://*.stripe.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 'unsafe-eval' kept off in prod; Next.js dev needs it.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com`,
  "connect-src 'self' https://api.stripe.com https://*.ingest.sentry.io https://*.r2.cloudflarestorage.com https://api-m.paypal.com https://api-m.sandbox.paypal.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pics
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com", // Cloudflare R2
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry. When SENTRY_DSN / SENTRY_AUTH_TOKEN are unset the wrapper
// is effectively a passthrough — local dev and CI need no Sentry config.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
  // Tunnel requests through our own origin to bypass ad-blockers eating events.
  tunnelRoute: "/monitoring",
});
