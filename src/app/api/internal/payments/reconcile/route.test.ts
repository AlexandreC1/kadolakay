import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({ reconcile: vi.fn() }));
vi.mock("@/services/reconcile-payments", () => ({ reconcileStripeCheckouts: mock.reconcile }));
import { GET } from "./route";
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
it("rejects missing and non-ASCII token values without throwing or running jobs", async () => {
  vi.stubEnv("CRON_SECRET", "x".repeat(32));
  expect((await GET(new NextRequest("http://localhost/api/internal/payments/reconcile"))).status).toBe(401);
  expect((await GET(new NextRequest("http://localhost/api/internal/payments/reconcile", { headers: { authorization: `Bearer ${"é".repeat(32)}` } }))).status).toBe(401);
  expect(mock.reconcile).not.toHaveBeenCalled();
});
it("reports failed recovery as unavailable without leaking provider details", async () => {
  vi.stubEnv("CRON_SECRET", "x".repeat(32));
  mock.reconcile.mockRejectedValue(new Error("SECRET_PROVIDER_DETAIL"));
  const response = await GET(new NextRequest("http://localhost/api/internal/payments/reconcile", { headers: { authorization: `Bearer ${"x".repeat(32)}` } }));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("SECRET_PROVIDER_DETAIL");
});
