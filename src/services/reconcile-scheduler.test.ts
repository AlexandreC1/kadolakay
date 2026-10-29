import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import run from "../../netlify/functions/reconcile-payments.mjs";
describe("free-tier recovery scheduler", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); vi.stubEnv("RECONCILIATION_ENABLED", "false"); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("does no network work before explicit opt-in", async () => {
    expect((await run()).status).toBe(204); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not follow a redirect carrying the job credential", async () => {
    vi.stubEnv("RECONCILIATION_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example"); vi.stubEnv("CRON_SECRET", "x".repeat(32)); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kadolakay.example");
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await run();
    expect(fetchMock.mock.calls[0][0].href).toBe("https://kadolakay.example/api/internal/payments/reconcile");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "error", headers: { Authorization: `Bearer ${"x".repeat(32)}` } });
  });
  it("rejects non-HTTPS configuration before transmitting a credential", async () => {
    vi.stubEnv("RECONCILIATION_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example"); vi.stubEnv("CRON_SECRET", "x".repeat(32)); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://kadolakay.example");
    await expect(run()).rejects.toThrow("origin invalid"); expect(fetchMock).not.toHaveBeenCalled();
  });
});
