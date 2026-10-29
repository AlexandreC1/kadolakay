import { describe, it, expect, vi, beforeEach } from "vitest";

// A tiny in-memory stand-in for Postgres. It models the two things the race
// depends on: reads return a snapshot taken at read time, and transactions on
// the same row run one after another (Postgres's row lock).
const state = vi.hoisted(() => ({
  orderStatus: "PENDING" as string,
  fulfilledQty: 0,
  itemQuantity: 1,
  itemIncrements: 0,
  queued: [] as unknown[],
  audits: [] as unknown[],
}));

vi.mock("./db", () => {
  let lock: Promise<unknown> = Promise.resolve();

  const tx = {
    orderItem: { groupBy: async () => [] },
    order: {
      // Unconditional write, kept so the test also runs against the old
      // implementation and shows the double count it produced.
      update: async () => {
        state.orderStatus = "PAID";
      },
      updateMany: async ({ where, data }: { where: { status: { in: string[] } }; data: { status: string } }) => {
        if (!where.status.in.includes(state.orderStatus)) return { count: 0 };
        state.orderStatus = data.status;
        return { count: 1 };
      },
    },
    auditLog: { create: async (args: unknown) => { state.audits.push(args); } },
    // SELECT ... FOR UPDATE on registry_items
    $queryRaw: async () => [{ id: "item_1", quantity: state.itemQuantity, fulfilledQty: state.fulfilledQty }],
    emailOutbox: { create: async (args: unknown) => { state.queued.push(args); } },
    $executeRaw: async () => {
      state.itemIncrements += 1;
      state.fulfilledQty += 1;
      return 1;
    },
  };

  return {
    db: {
      order: {
        findUnique: async () => ({
          id: "order_1",
          status: state.orderStatus,
          isAnonymous: false,
          buyerName: "Buyer",
          buyerEmail: "buyer@example.com",
          giftMessage: null,
          orderNumber: "KL-1",
          totalUSD: 25,
          totalHTG: null,
          payment: { currency: "USD" },
          items: [
            {
              quantity: 1,
              registryItemId: "item_1",
              registryItem: {
                title: "Crib",
                registry: {
                  title: "Baby shower",
                  locale: "fr",
                  slug: "baby",
                  user: { email: "owner@example.com", name: "Owner" },
                },
              },
            },
          ],
        }),
      },
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => {
        const run = lock.then(() => fn(tx));
        lock = run.catch(() => {});
        return run;
      },
    },
  };
});

vi.mock("./email", () => ({ deliverEmail: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

import { fulfillOrder } from "./orders";

type Queued = { data: { template: string; to: string; dedupeKey: string; locale: string } };

describe("fulfillOrder", () => {
  beforeEach(() => {
    state.orderStatus = "PENDING";
    state.fulfilledQty = 0;
    state.itemQuantity = 1;
    state.itemIncrements = 0;
    state.queued = [];
    state.audits = [];
  });

  it("fulfills an order exactly once when two webhooks arrive together", async () => {
    // Both calls read PENDING before either transaction starts — the exact
    // interleaving a duplicate MonCash or PayPal delivery produces.
    const results = await Promise.all([
      fulfillOrder("order_1"),
      fulfillOrder("order_1"),
    ]);

    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(state.itemIncrements).toBe(1);
    expect(state.fulfilledQty).toBe(1);
    const q = state.queued as Queued[];
    expect(q.map((x) => x.data.template).sort()).toEqual(["gift-notification", "order-receipt"]);
    expect(q.find((x) => x.data.template === "gift-notification")?.data).toMatchObject({
      to: "owner@example.com", dedupeKey: "order:order_1:gift-notification", locale: "fr",
    });
  });

  it("skips a late retry of an already paid order", async () => {
    state.orderStatus = "PAID";

    expect(await fulfillOrder("order_1")).toBeNull();
    expect(state.itemIncrements).toBe(0);
    expect(state.queued).toHaveLength(0);
  });

  it("never re-fulfills an order that moved past PAID (refunded, shipped...)", async () => {
    for (const status of ["REFUNDED", "SHIPPED", "CANCELLED", "NEEDS_REFUND"]) {
      state.orderStatus = status;
      expect(await fulfillOrder("order_1")).toBeNull();
      expect(state.orderStatus).toBe(status);
    }
    expect(state.itemIncrements).toBe(0);
    expect(state.queued).toHaveLength(0);
  });

  it("a late payment for an item someone else already gave becomes NEEDS_REFUND", async () => {
    state.orderStatus = "EXPIRED";
    state.fulfilledQty = 1; // the only crib was gifted while this buyer was paying

    const result = await fulfillOrder("order_1");

    expect(result?.status).toBe("NEEDS_REFUND");
    expect(state.orderStatus).toBe("NEEDS_REFUND");
    expect(state.itemIncrements).toBe(0);
    expect(state.queued).toHaveLength(0);
    expect(state.audits).toHaveLength(1);
  });

  it("a late payment that still fits is fulfilled normally", async () => {
    state.orderStatus = "EXPIRED";
    state.itemQuantity = 2;
    state.fulfilledQty = 1;

    expect((await fulfillOrder("order_1"))?.status).toBe("PAID");
    expect(state.fulfilledQty).toBe(2);
  });
});
