import { describe, it, expect } from "vitest";
import { getClientIp, unconfiguredResult, checkRateLimit, LIMITS } from "./rate-limit";

const h = (o: Record<string, string>) => new Headers(o);

describe("getClientIp (M2)", () => {
  it("prefers platform headers", () => {
    expect(getClientIp(h({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "6.6.6.6" }))).toBe("1.1.1.1");
    expect(getClientIp(h({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "6.6.6.6" }))).toBe("2.2.2.2");
  });
  it("a spoofed first X-Forwarded-For hop is ignored", () => {
    expect(getClientIp(h({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" }))).toBe("3.3.3.3");
  });
  it("falls back to anon", () => {
    expect(getClientIp(h({}))).toBe("anon");
  });
});

describe("unconfigured Upstash", () => {
  const prod = { NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;
  it("fails closed in production for auth/checkout only", () => {
    expect(unconfiguredResult("auth", prod).ok).toBe(false);
    expect(unconfiguredResult("magicLink", prod).ok).toBe(false);
    expect(unconfiguredResult("checkout", prod).ok).toBe(false);
    expect(unconfiguredResult("webhook", prod).ok).toBe(true);
    expect(unconfiguredResult("general", prod).ok).toBe(true);
  });
  it("explicit override and non-production allow", () => {
    expect(unconfiguredResult("auth", { ...prod, RATE_LIMIT_ALLOW_UNCONFIGURED: "1" }).ok).toBe(true);
    expect(unconfiguredResult("auth", { NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv).ok).toBe(true);
  });
  it("checkRateLimit allows in tests without Redis", async () => {
    expect((await checkRateLimit("auth", "x")).ok).toBe(true);
  });
  it("limits are sane", () => {
    expect(LIMITS.auth[0]).toBeGreaterThanOrEqual(10);
    expect(LIMITS.magicLink).toEqual([3, "15 m"]);
  });
});
