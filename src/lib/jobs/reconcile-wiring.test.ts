import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payments", () => ({
  getPaymentProvider: (p: string) => ({ provider: p.toUpperCase(), create: vi.fn(), verify: vi.fn() }),
}));
vi.mock("@/lib/orders", () => ({ claimAndFulfill: vi.fn() }));

import { getReconcileDeps } from "./reconcile-wiring";
import { claimAndFulfill } from "@/lib/orders";

describe("getReconcileDeps", () => {
  it("wires Stripe, PayPal and MonCash verifiers to claimAndFulfill, never Natcash", async () => {
    const deps = await getReconcileDeps();
    expect(deps).not.toBeNull();
    expect(Object.keys(deps!.verifiers).sort()).toEqual(["MONCASH", "PAYPAL", "STRIPE"]);
    expect(deps!.claimAndFulfill).toBe(claimAndFulfill);
  });
});
