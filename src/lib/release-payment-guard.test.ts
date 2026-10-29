import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
const base = {
  ...process.env, DATABASE_URL: "postgresql://fixture:fixture@localhost/fixture_test", AUTH_SECRET: "fixture-secret-at-least-thirty-two-characters",
  AUTH_GOOGLE_ID: "fixture.apps.googleusercontent.com", AUTH_GOOGLE_SECRET: "fixture", UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "fixture",
  CRON_SECRET: "fixture-cron-secret-at-least-thirty-two-characters", NEXT_PUBLIC_APP_URL: "https://staging.example.invalid", CHECKOUT_ENABLED: "false",
};
const run = (env: Record<string, string | undefined>, staging = false) => spawnSync(process.execPath, ["scripts/check-release-env.mjs", ...(staging ? ["--staging"] : [])], { env: { ...base, ...env }, encoding: "utf8", timeout: 10000 });
describe("Haiti marketplace payment release boundary", () => {
  it("does not demand a live Stripe account for a registry-only configuration", () => {
    const result = run({ STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("does not replace");
  });
  it("blocks production checkout until merchant-direct settlement is implemented", () => {
    const result = run({ CHECKOUT_ENABLED: "true", PAYMENT_MODE: "sandbox", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("merchant-direct production settlement is not implemented");
  });
  it("permits explicitly staged sandbox verification but never accepts live Stripe keys", () => {
    expect(run({ CHECKOUT_ENABLED: "true", PAYMENT_MODE: "sandbox", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" }, true).status).toBe(0);
    const result = run({ CHECKOUT_ENABLED: "true", PAYMENT_MODE: "live", STRIPE_SECRET_KEY: "sk_live_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" }, true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("sandbox mode and test credentials");
    expect(result.stderr).not.toContain("sk_live_fixture");
  });
});
