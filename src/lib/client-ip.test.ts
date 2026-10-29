import { describe, expect, it } from "vitest";
import { rateLimitClientKey } from "./client-ip";

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
});
