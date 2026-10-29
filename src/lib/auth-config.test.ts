import { describe, expect, it } from "vitest";
import { authErrorKey, getAuthAvailability, safeAuthRedirect } from "./auth-config";

describe("auth configuration", () => {
  it("does not offer incomplete providers or expose credentials", () => {
    expect(getAuthAvailability({ AUTH_GOOGLE_ID: "client" })).toEqual({ social: [], email: false });
    const result = getAuthAvailability({ DATABASE_URL: "postgresql://local", AUTH_SECRET: "secret", AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "private", AUTH_GITHUB_ID: "id", AUTH_GITHUB_SECRET: "private" });
    expect(result).toEqual({ social: ["google", "github"], email: false });
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("requires an explicit email sender and trims empty credentials", () => {
    expect(getAuthAvailability({DATABASE_URL: "local", AUTH_SECRET: "secret", AUTH_RESEND_KEY: "key"}).email).toBe(false);
    expect(getAuthAvailability({DATABASE_URL: "local", AUTH_SECRET: "secret", AUTH_RESEND_KEY: "key", AUTH_RESEND_FROM: "hello@example.com"}).email).toBe(true);
    expect(getAuthAvailability({DATABASE_URL: "local", AUTH_SECRET: "secret", AUTH_GOOGLE_ID: "  ", AUTH_GOOGLE_SECRET: "key"}).social).toEqual([]);
  });
});

describe("OAuth return URLs", () => {
  const base = "https://kadolakay.example";
  it("preserves same-origin localized routes", () => {
    expect(safeAuthRedirect("/fr/dashboard?tab=orders", base)).toBe(`${base}/fr/dashboard?tab=orders`);
  });
  it.each(["https://attacker.example", "//attacker.example", "javascript:alert(1)", "https://kadolakay.example.attacker.example", "https://kadolakay.example@attacker.example", "https://[invalid", "/\\attacker.example"])("rejects an unsafe redirect: %s", (url) => {
    expect(safeAuthRedirect(url, base)).toBe(`${base}/`);
  });
});

describe("safe public errors", () => {
  it("maps provider errors without echoing untrusted text", () => {
    expect(authErrorKey("OAuthAccountNotLinked")).toBe("accountNotLinked");
    expect(authErrorKey("Verification")).toBe("expiredLink");
    expect(authErrorKey("<script>alert(1)</script>")).toBe("signInFailed");
  });
});
