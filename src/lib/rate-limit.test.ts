import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("rate limit safety", () => {
  it("enforces the development checkout window", async () => {
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { checkRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 10; i++) expect((await checkRateLimit("checkout", "buyer")).ok).toBe(true);
    expect((await checkRateLimit("checkout", "buyer")).ok).toBe(false);
    expect((await checkRateLimit("checkout", "another-buyer")).ok).toBe(true);
  });
  it("fails closed in production when shared Redis is absent", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { checkRateLimit } = await import("./rate-limit");
    expect(await checkRateLimit("auth", "buyer")).toMatchObject({ ok: false, unavailable: true });
  });
});
