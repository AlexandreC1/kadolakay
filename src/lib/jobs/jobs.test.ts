import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  emailOutbox: { create: vi.fn(), update: vi.fn() },
  order: { findMany: vi.fn(), updateMany: vi.fn() },
  payment: { findMany: vi.fn(), updateMany: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("resend", () => ({ Resend: vi.fn() }));

import { backoffMs, drainOutbox, enqueueEmail, MAX_ATTEMPTS } from "@/lib/email/outbox";
import { expireOrders } from "./expire-orders";
import { reconcilePayments } from "./reconcile-payments";
import type { PaymentVerifier, VerifiedPayment } from "@/lib/contracts/payments";

beforeEach(() => vi.clearAllMocks());

const payload = { buyerName: "A", orderNumber: "1", businessName: "B" };

describe("enqueueEmail", () => {
  it("normalises recipient and stores dedupeKey", async () => {
    await enqueueEmail({ template: "order-shipped", to: " A@B.com ", payload, dedupeKey: "order:1:order-shipped" });
    expect(db.emailOutbox.create.mock.calls[0][0].data).toMatchObject({ to: "a@b.com", dedupeKey: "order:1:order-shipped", locale: "ht" });
  });
  it("swallows duplicate dedupeKey (P2002)", async () => {
    db.emailOutbox.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
    await expect(enqueueEmail({ template: "order-shipped", to: "a@b.com", payload, dedupeKey: "k" })).resolves.toBeUndefined();
  });
  it("rethrows other errors", async () => {
    db.emailOutbox.create.mockRejectedValueOnce(new Error("db down"));
    await expect(enqueueEmail({ template: "order-shipped", to: "a@b.com", payload, dedupeKey: "k" })).rejects.toThrow("db down");
  });
  it("drops header-injection recipients", async () => {
    await enqueueEmail({ template: "order-shipped", to: "a@b.com\r\nbcc:x@y", payload, dedupeKey: "k" });
    expect(db.emailOutbox.create).not.toHaveBeenCalled();
  });
});

describe("drainOutbox", () => {
  const row = (attempts: number) => ({ id: `r${attempts}`, to: "a@b.com", template: "order-shipped", locale: "ht", payload, attempts, dedupeKey: "k" });
  it("marks sent, retries with backoff, dead-letters after MAX_ATTEMPTS", async () => {
    db.$queryRaw.mockResolvedValueOnce([row(1), row(2), row(MAX_ATTEMPTS)]);
    const deliver = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("429")).mockRejectedValueOnce(new Error("bad"));
    const now = new Date("2026-10-12T12:00:00Z");
    const r = await drainOutbox({ deliver, now });
    expect(r).toEqual({ claimed: 3, sent: 1, retried: 1, failed: 1 });
    expect(deliver).toHaveBeenCalledWith("order-shipped", "a@b.com", payload, "ht", "k");
    const updates = db.emailOutbox.update.mock.calls.map((c) => c[0].data);
    expect(updates[0].status).toBe("SENT");
    expect(updates[1]).toMatchObject({ status: "PENDING", sendAfter: new Date(now.getTime() + backoffMs(2)) });
    expect(updates[2].status).toBe("FAILED");
  });
  it("backoff is capped at 1h", () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(20)).toBe(3_600_000);
  });
});

describe("expireOrders", () => {
  it("excludes Natcash orders inside the 72h grace window", async () => {
    const now = new Date("2026-10-12T12:00:00Z");
    db.order.findMany.mockResolvedValueOnce([{ id: "o1" }]);
    db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
    db.order.updateMany.mockResolvedValueOnce({ count: 1 });
    const r = await expireOrders(now);
    expect(r.expired).toBe(1);
    const where = db.order.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("PENDING");
    const natcash = where.OR.find((c: { payment?: { is?: { provider?: unknown } } }) => c.payment?.is?.provider === "NATCASH");
    expect(natcash.createdAt.lt).toEqual(new Date(now.getTime() - 72 * 3_600_000));
    expect(db.order.updateMany.mock.calls[0][0].where).toMatchObject({ status: "PENDING" });
  });
  it("no-ops when nothing to expire", async () => {
    db.order.findMany.mockResolvedValueOnce([]);
    expect(await expireOrders()).toEqual({ expired: 0 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("reconcilePayments", () => {
  const verified = (status: VerifiedPayment["status"], orderId = "o1"): VerifiedPayment => ({
    orderId, provider: "STRIPE", providerTxId: "pi_1", amount: new Prisma.Decimal(10), currency: "USD", status, rawSummary: {},
  });
  const verifier = (v: () => Promise<VerifiedPayment>): PaymentVerifier => ({ provider: "STRIPE", create: vi.fn(), verify: vi.fn(v) });

  it("fulfils COMPLETED via claimAndFulfill, counts pending/failed/errors", async () => {
    const claim = vi.fn().mockResolvedValue("fulfilled");
    const results = [verified("COMPLETED"), verified("PENDING", "o2"), verified("FAILED", "o3")];
    let i = 0;
    const v = verifier(async () => {
      if (i === 3) throw new Error("timeout");
      return results[i++];
    });
    const rows = ["o1", "o2", "o3", "o4"].map((orderId) => ({ orderId, provider: "STRIPE" as const, providerRef: "cs_1" }));
    i = 0;
    const r = await reconcilePayments(rows, { verifiers: { STRIPE: v }, claimAndFulfill: claim });
    expect(claim).toHaveBeenCalledTimes(1);
    expect(r.outcomes).toMatchObject({ fulfilled: 1, pending: 1, failed: 1, error: 1 });
  });
  it("rejects provider answers for a different order and skips Natcash", async () => {
    const claim = vi.fn();
    const r = await reconcilePayments(
      [{ orderId: "o1", provider: "STRIPE", providerRef: null }, { orderId: "o9", provider: "NATCASH", providerRef: null }],
      { verifiers: { STRIPE: verifier(async () => verified("COMPLETED", "other")) }, claimAndFulfill: claim },
    );
    expect(claim).not.toHaveBeenCalled();
    expect(r.outcomes).toMatchObject({ rejected: 1, skipped: 1 });
  });
});
