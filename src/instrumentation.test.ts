import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@sentry/nextjs", () => ({ init: vi.fn(), captureRequestError: vi.fn() }));
import { register } from "./instrumentation";
afterEach(() => vi.unstubAllEnvs());
describe("server startup", () => {
  it("rejects incomplete production configuration even when Sentry is disabled", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs"); vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-server"); vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SENTRY_DSN", "");
    await expect(register()).rejects.toThrow(/DATABASE_URL/);
  });
  it("does not perform runtime validation during production builds", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs"); vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build"); vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SENTRY_DSN", "");
    await expect(register()).resolves.toBeUndefined();
  });
});
