import { describe, it, expect, vi } from "vitest";
import { validateServerEnv, assertServerEnv } from "./env";

const good = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://kadolakay.com",
  DATABASE_URL: "postgresql://x",
  AUTH_SECRET: "a".repeat(32),
  AUTH_GOOGLE_ID: "g", AUTH_GOOGLE_SECRET: "g", AUTH_RESEND_KEY: "re_x",
  UPSTASH_REDIS_REST_URL: "https://u.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t",
  STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  S3_ENDPOINT: "https://r2.example", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s",
  S3_BUCKET: "b", S3_PUBLIC_URL: "https://cdn.kadolakay.com", CRON_SECRET: "c".repeat(32),
  PAYPAL_ENABLED: "false", MONCASH_ENABLED: "false", NATCASH_ENABLED: "false",
} as unknown as NodeJS.ProcessEnv;

describe("env validation", () => {
  it("passes a complete production env", () => {
    expect(validateServerEnv(good)).toEqual([]);
  });
  it("fails closed when Upstash is missing in production (review M2)", () => {
    const env = { ...good, UPSTASH_REDIS_REST_URL: undefined };
    expect(validateServerEnv(env).some((p) => p.startsWith("UPSTASH_REDIS_REST_URL"))).toBe(true);
    expect(() => assertServerEnv(env)).toThrow(/UPSTASH_REDIS_REST_URL/);
  });
  it("requires provider secrets only when the provider is enabled", () => {
    expect(validateServerEnv({ ...good, PAYPAL_ENABLED: "true" }).some((p) => p.startsWith("PAYPAL_CLIENT_ID"))).toBe(true);
  });
  it("never prints secret values and only warns outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = { ...good, NODE_ENV: "development", AUTH_SECRET: "short-secret-value" } as NodeJS.ProcessEnv;
    expect(() => assertServerEnv(env)).not.toThrow();
    expect(String(warn.mock.calls[0][0])).not.toContain("short-secret-value");
    warn.mockRestore();
  });
});
