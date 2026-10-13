import { describe, it, expect, vi, beforeEach } from "vitest";

// A tiny in-memory stand-in for Postgres. It models the two things the race
// depends on: reads return a snapshot taken at read time, and transactions on
// the same row run one after another (Postgres's row lock).
const state = vi.hoisted(() => ({
  orderStatus: "PENDING" as string,
  fulfilledQty: 0,
  itemIncrements: 0,
  queued: [] as unknown[],
}));

vi.mock("./db", () => {
  let lock: Promise<unknown> = Promise.resolve();

  const tx = {
    order: {
      // Unconditional write, kept so the test also runs against the old
      // implementation and shows the double count it produced.
      update: async () => {
        state.orderStatus = "PAID";
      },
      updateMany: async ({ where }: { where: { status: { not: string } } }) => {
        if (state.orderStatus === where.status.not) return { count: 0 };
        state.orderStatus = "PAID";
        return { count: 1 };
      },
    },
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
    state.itemIncrements = 0;
    state.queued = [];
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
});
