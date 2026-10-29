import { describe, it, expect, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({ orderStatus: "PENDING", fulfilledQty: 0, reservedQty: 1, writes: 0 }));
vi.mock("./db", () => {
  let lock = Promise.resolve<unknown>(undefined);
  const tx = {
    order: { updateMany: async () => { if (state.orderStatus !== "PENDING") return { count: 0 }; state.orderStatus = "PAID"; return { count: 1 }; } },
    payment: { update: vi.fn() },
    $executeRaw: async (sql: TemplateStringsArray) => { state.writes++; if (sql.join("").includes("UPDATE registry_items")) { state.fulfilledQty++; state.reservedQty--; } return 1; },
  };
  return { db: {
    order: { findUnique: async () => ({ status: state.orderStatus, payment: { provider: "STRIPE", currency: "USD", amountUSD: "25.00", stripePaymentId: "cs_test_1" }, items: [{ registryItemId: "item_1", productId: "product_1", quantity: 1, registryItem: { title: "Crib", registry: { title: "Baby", slug: "baby", user: { email: null } } } }], buyerName: "Buyer", buyerEmail: "test@example.com", orderNumber: "KL-1", totalUSD: "25.00" }) },
    $transaction: (fn: (value: typeof tx) => Promise<unknown>) => { const run = lock.then(() => fn(tx)); lock = run.catch(() => {}); return run; },
  } };
});
vi.mock("./email", () => ({ sendGiftNotification: vi.fn(), sendOrderConfirmation: vi.fn() }));
import { fulfillOrder } from "./orders";
const evidence = { sessionId: "cs_test_1", eventId: "evt_1", amountMinor: 2500, currency: "usd" };
describe("payment fulfillment", () => {
  beforeEach(() => { state.orderStatus = "PENDING"; state.fulfilledQty = 0; state.reservedQty = 1; state.writes = 0; });
  it("consumes a reservation once for simultaneous duplicate deliveries", async () => {
    const result = await Promise.all([fulfillOrder("o1", evidence), fulfillOrder("o1", evidence)]);
    expect(result.filter(Boolean)).toHaveLength(1); expect(state.writes).toBe(2); expect(state.reservedQty).toBe(0);
  });
  it.each([{ ...evidence, amountMinor: 1 }, { ...evidence, currency: "htg" }, { ...evidence, sessionId: "other" }])("rejects mismatched payment evidence", async (bad) => {
    await expect(fulfillOrder("o1", bad)).rejects.toThrow("PAYMENT_EVIDENCE_MISMATCH"); expect(state.writes).toBe(0);
  });
  it("does not resurrect a cancelled or refunded order", async () => {
    for (const status of ["CANCELLED", "REFUNDED", "PAID"]) { state.orderStatus = status; expect(await fulfillOrder("o1", evidence)).toBeNull(); }
    expect(state.writes).toBe(0);
  });
});
