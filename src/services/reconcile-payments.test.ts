import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), update: vi.fn(), retrieve: vi.fn(), expire: vi.fn(), list: vi.fn(), fulfill: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { order: { findMany: mocks.findMany }, payment: { update: mocks.update } } }));
vi.mock("@/lib/payments/stripe", () => ({ stripe: { checkout: { sessions: { retrieve: mocks.retrieve, expire: mocks.expire, list: mocks.list } } } }));
vi.mock("@/lib/orders", () => ({ fulfillOrder: mocks.fulfill }));
vi.mock("./checkout", () => ({ releaseCheckout: mocks.release }));
import { reconcileStripeCheckouts } from "./reconcile-payments";
describe("stale payment reconciliation", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example"); mocks.findMany.mockResolvedValue([{ id: "order1", createdAt: new Date(0), payment: { stripePaymentId: "cs_1" } }]); });
  afterEach(() => vi.unstubAllEnvs());
  it("does not wake the database before the provider is configured", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(await reconcileStripeCheckouts()).toEqual({ checked: 0, recovered: 0, failed: 0 });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("recovers a paid session from a missed webhook", async () => {
    mocks.retrieve.mockResolvedValue({ id: "cs_1", payment_status: "paid", amount_total: 1999, currency: "usd" });
    expect(await reconcileStripeCheckouts()).toEqual({ checked: 1, recovered: 1, failed: 0 });
    expect(mocks.fulfill).toHaveBeenCalledWith("order1", { sessionId: "cs_1", eventId: "reconcile:cs_1", amountMinor: 1999, currency: "usd" });
  });
  it("closes a payable session before releasing stock", async () => {
    mocks.retrieve.mockResolvedValue({ id: "cs_1", payment_status: "unpaid", status: "open" });
    await reconcileStripeCheckouts();
    expect(mocks.expire.mock.invocationCallOrder[0]).toBeLessThan(mocks.release.mock.invocationCallOrder[0]);
  });
  it("retains stock when provider expiration cannot be confirmed", async () => {
    mocks.retrieve.mockResolvedValue({ id: "cs_1", payment_status: "unpaid", status: "open" }); mocks.expire.mockRejectedValue(new Error("TIMEOUT"));
    expect(await reconcileStripeCheckouts()).toEqual({ checked: 1, recovered: 0, failed: 1 }); expect(mocks.release).not.toHaveBeenCalled();
  });
});
