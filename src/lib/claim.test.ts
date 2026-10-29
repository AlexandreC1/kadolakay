import { describe, it, expect, vi, beforeEach } from "vitest";
import { money } from "./money";
import type { VerifiedPayment } from "./contracts/payments";

const m = vi.hoisted(() => ({
  paymentFind: vi.fn(), paymentUpdate: vi.fn(), paymentUpdateMany: vi.fn(), auditCreate: vi.fn(),
  orderFind: vi.fn(), updateMany: vi.fn(), exec: vi.fn(),
}));
vi.mock("./email", () => ({ sendGiftNotification: vi.fn(), sendOrderConfirmation: vi.fn() }));
vi.mock("./db", () => ({
  db: {
    payment: { findUnique: m.paymentFind, update: m.paymentUpdate, updateMany: m.paymentUpdateMany },
    auditLog: { create: m.auditCreate },
    order: { findUnique: m.orderFind },
    $transaction: async (fn: (tx: unknown) => unknown) => fn({ order: { updateMany: m.updateMany }, payment: { update: m.paymentUpdate }, auditLog: { create: m.auditCreate }, $executeRaw: m.exec }),
  },
}));
const { claimAndFulfill, confirmManualPayment } = await import("./orders");

const v = (o: Partial<VerifiedPayment> = {}): VerifiedPayment => ({
  orderId: "ord_1", provider: "PAYPAL", providerTxId: "CAP1", amount: money("60.07"), currency: "USD", status: "COMPLETED", rawSummary: {}, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.paymentFind.mockResolvedValue({ provider: "PAYPAL", status: "PENDING", currency: "USD", amountExpected: "60.07", amountHTG: null, amountUSD: "60.07" });
  m.orderFind.mockResolvedValue({ id: "ord_1", status: "PENDING", items: [], payment: null, isAnonymous: false });
  m.updateMany.mockResolvedValue({ count: 1 });
  m.paymentUpdate.mockResolvedValue({});
});

describe("claimAndFulfill", () => {
  it("fulfills an exact match", async () => {
    expect(await claimAndFulfill(v())).toBe("fulfilled");
    expect(m.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED", providerTxId: "CAP1" }) }));
  });
  it.each([
    ["amount", { amount: money("0.01") }],
    ["currency", { currency: "HTG" as const }],
    ["status", { status: "PENDING" as const }],
    ["provider", { provider: "STRIPE" as const }],
  ])("rejects a %s mismatch without touching the order", async (_n, o) => {
    expect(await claimAndFulfill(v(o))).toBe("rejected");
    expect(m.paymentUpdate).not.toHaveBeenCalled();
    expect(m.updateMany).not.toHaveBeenCalled();
  });
  it("treats a reused transaction id (P2002) as duplicate", async () => {
    m.paymentUpdate.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    expect(await claimAndFulfill(v())).toBe("duplicate");
    // The conditional claim is now inside the rolled-back settlement transaction.
    expect(m.exec).not.toHaveBeenCalled();
  });
  it("unknown order → rejected", async () => {
    m.paymentFind.mockResolvedValue(null);
    expect(await claimAndFulfill(v())).toBe("rejected");
  });
  it("propagates transaction failure so a provider retry can repair it", async () => {
    m.paymentUpdate.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(claimAndFulfill(v())).rejects.toThrow("database unavailable");
    expect(m.exec).not.toHaveBeenCalled();
  });
  it("repairs a historical completed-payment / unfulfilled-order split commit", async () => {
    m.paymentFind.mockResolvedValue({ provider: "PAYPAL", status: "COMPLETED", currency: "USD", amountExpected: "60.07" });
    expect(await claimAndFulfill(v())).toBe("fulfilled");
    expect(m.updateMany).toHaveBeenCalled();
    expect(m.paymentUpdate).not.toHaveBeenCalled();
  });
});

describe("confirmManualPayment", () => {
  beforeEach(() => m.paymentFind.mockResolvedValue({ provider: "NATCASH", status: "PENDING" }));
  it("confirms a pending Natcash payment once and audits it", async () => {
    m.paymentUpdateMany.mockResolvedValue({ count: 1 });
    expect(await confirmManualPayment({ orderId: "ord_1", reference: "NC-123", adminId: "adm" })).toBe("fulfilled");
    expect(m.auditCreate).toHaveBeenCalled();
    m.paymentFind.mockResolvedValue({ provider: "NATCASH", status: "COMPLETED" });
    expect(await confirmManualPayment({ orderId: "ord_1", reference: "NC-123", adminId: "adm" })).toBe("duplicate");
  });
  it("can still confirm a transfer after the expire job failed the payment", async () => {
    m.paymentUpdateMany.mockResolvedValue({ count: 1 });
    m.orderFind.mockResolvedValue({ id: "ord_1", status: "EXPIRED", items: [], payment: null, isAnonymous: false });
    expect(await confirmManualPayment({ orderId: "ord_1", reference: "NC-124", adminId: "adm" })).toBe("fulfilled");
    expect(m.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED", manualReference: "NC-124" }) }));
  });
  it("rejects malformed references", async () => {
    expect(await confirmManualPayment({ orderId: "o", reference: "<script>", adminId: "a" })).toBe("rejected");
  });
});
