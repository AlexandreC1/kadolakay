import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Per-request nonce CSP is set in src/proxy.ts.
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: __dirname },
  outputFileTracingIncludes: { "/api/registries/**": ["./src/assets/fonts/**"] },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
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
      // Camera access is confined to the user-triggered QR finder. Audio stays disabled.
      ...["/find", "/ht/find", "/fr/find", "/en/find"].map(source => ({ source, headers: [
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()" },
      ] })),
    ];
  },
};

// Wrap with Sentry. When SENTRY_DSN / SENTRY_AUTH_TOKEN are unset the wrapper
// is effectively a passthrough — local dev and CI need no Sentry config.
const configWithIntl = withNextIntl(nextConfig);
export default process.env.SENTRY_DSN ? withSentryConfig(configWithIntl, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
  // Tunnel requests through our own origin to bypass ad-blockers eating events.
  tunnelRoute: "/monitoring",
}) : configWithIntl;
