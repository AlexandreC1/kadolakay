import { isIP } from "node:net";
import { recordOperationalEvent } from "./operational-events";

type Platform = Record<string, string | undefined>;

/** Client IP headers that only the hosting edge can set. Forwarding headers a client can send are never trusted. */
export const HOST_CLIENT_IP_HEADERS = {
  netlify: "x-nf-client-connection-ip",
  vercel: "x-vercel-forwarded-for",
} as const;
const allowedHeaders = new Set<string>(Object.values(HOST_CLIENT_IP_HEADERS));

/**
 * Netlify exposes only URL, SITE_NAME and SITE_ID to functions at runtime;
 * NETLIFY=true is a build-time variable. Accept either form.
 */
export function isNetlifyRuntime(platform: Platform = process.env) {
  return platform.NETLIFY === "true" || Boolean(platform.SITE_ID?.trim() && platform.SITE_NAME?.trim());
}

/**
 * The single header trusted for the client IP on this host, or null.
 * CLIENT_IP_HEADER is an explicit operator choice and wins, but only from the allowlist.
 */
export function trustedClientIpHeader(platform: Platform = process.env): string | null {
  const configured = platform.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (configured) return allowedHeaders.has(configured) ? configured : null;
  if (isNetlifyRuntime(platform)) return HOST_CLIENT_IP_HEADERS.netlify;
  if (platform.VERCEL === "1") return HOST_CLIENT_IP_HEADERS.vercel;
  return null;
}

let nextFallbackLogAt = 0;
function reportUnverified(platform: Platform) {
  if (platform.NODE_ENV !== "production") return;
  const now = Date.now();
  if (now < nextFallbackLogAt) return;
  nextFallbackLogAt = now + 60_000;
  recordOperationalEvent("client_ip_unverified", { outcome: "failed" });
}

/** Only trust a host-owned header when running on that host. Never trust user forwarding headers. */
export function rateLimitClientKey(headers: Headers, platform: Platform = process.env) {
  const header = trustedClientIpHeader(platform);
  const candidate = header ? headers.get(header)?.trim() : undefined;
  if (candidate && isIP(candidate)) return candidate;
  // Fail into a shared bucket when the hosting contract is absent or malformed, and make it visible:
  // in production every anonymous visitor would share one limit. Do not let a client manufacture
  // unlimited keys with arbitrary strings or comma lists.
  reportUnverified(platform);
  return "unverified-client";
}
