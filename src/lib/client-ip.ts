import { isIP } from "node:net";

/** Only trust a host-owned header when running on that host. Never trust user forwarding headers. */
export function rateLimitClientKey(headers: Headers, platform: Record<string, string | undefined> = process.env) {
  const header = platform.NETLIFY === "true" ? "x-nf-client-connection-ip" : platform.VERCEL === "1" ? "x-vercel-forwarded-for" : null;
  const candidate = header ? headers.get(header)?.trim() : undefined;
  // Fail into a shared bucket when the hosting contract is absent or malformed.
  // Do not let a client manufacture unlimited keys with arbitrary strings or comma lists.
  return candidate && isIP(candidate) ? candidate : "unverified-client";
}
