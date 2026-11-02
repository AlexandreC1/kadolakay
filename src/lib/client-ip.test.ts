import { describe, expect, it } from "vitest";
import { rateLimitClientKey, trustedClientIpHeader, isNetlifyRuntime } from "./client-ip";

describe("host-bound client rate-limit identity", () => {
  it("ignores spoofed forwarding headers outside their platform", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "1.2.3.5", "x-vercel-forwarded-for": "1.2.3.6" });
    expect(rateLimitClientKey(headers, {})).toBe("unverified-client");
    expect(rateLimitClientKey(headers, { NETLIFY: "true" })).toBe("unverified-client");
  });
  it("accepts the platform IP and rejects arbitrary or list keys", () => {
    expect(rateLimitClientKey(new Headers({ "x-nf-client-connection-ip": "2001:db8::1" }), { NETLIFY: "true" })).toBe("2001:db8::1");
    expect(rateLimitClientKey(new Headers({ "x-vercel-forwarded-for": "192.0.2.1" }), { VERCEL: "1" })).toBe("192.0.2.1");
    for (const value of ["attacker-key", "192.0.2.1, 192.0.2.2", "999.0.0.1"]) {
      expect(rateLimitClientKey(new Headers({ "x-nf-client-connection-ip": value }), { NETLIFY: "true" })).toBe("unverified-client");
    }
  });
  it("recognises the Netlify function runtime, where NETLIFY=true is not set", () => {
    const runtime = { SITE_ID: "1d01c0c0-4554-4747-93b8-34ce3448ab95", SITE_NAME: "bayou", URL: "https://bayou.example" };
    expect(isNetlifyRuntime(runtime)).toBe(true);
    expect(rateLimitClientKey(new Headers({ "x-nf-client-connection-ip": "198.51.100.7" }), runtime)).toBe("198.51.100.7");
    expect(isNetlifyRuntime({ SITE_ID: "only-one-of-two" })).toBe(false);
  });
  it("lets the operator pick a host header, but only from the allowlist", () => {
    expect(trustedClientIpHeader({ CLIENT_IP_HEADER: "X-Vercel-Forwarded-For" })).toBe("x-vercel-forwarded-for");
    expect(trustedClientIpHeader({ CLIENT_IP_HEADER: "x-forwarded-for", VERCEL: "1" })).toBeNull();
    expect(rateLimitClientKey(new Headers({ "x-forwarded-for": "203.0.113.9" }), { CLIENT_IP_HEADER: "x-forwarded-for" })).toBe("unverified-client");
  });
});
