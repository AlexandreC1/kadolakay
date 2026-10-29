import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ findPayments: vi.fn(), findRegistry: vi.fn(), findProduct: vi.fn(), createItem: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  payment: { findMany: m.findPayments },
  registry: { findUnique: m.findRegistry },
  product: { findUnique: m.findProduct },
  registryItem: { create: m.createItem },
} }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "owner" } }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { loadPendingPayments } from "@/lib/jobs/reconcile-payments";
import { addBusinessProductToRegistry } from "@/actions/registry-item";

beforeEach(() => {
  vi.clearAllMocks();
  m.findPayments.mockResolvedValue([]);
  m.findRegistry.mockResolvedValue({ id: "reg1", userId: "owner", slug: "registry" });
  m.findProduct.mockResolvedValue({ id: "product1", name: "Gift", inStock: false, deletedAt: new Date(), business: { id: "business1", name: "Merchant", status: "APPROVED" } });
});

it("does not add a deleted, out-of-stock product to a registry", async () => {
  await expect(addBusinessProductToRegistry("reg1", "product1")).rejects.toThrow();
  expect(m.createItem).not.toHaveBeenCalled();
});

it("reconciliation includes expired payments marked FAILED by the expiry job", async () => {
  await loadPendingPayments(new Date());
  const query = m.findPayments.mock.calls[0][0];
  expect(query.where.status.in).toContain("FAILED");
});

it("reconciliation recovers COMPLETED payments whose fulfillment transaction failed", async () => {
  await loadPendingPayments(new Date());
  const query = m.findPayments.mock.calls[0][0];
  expect(query.where.status.in).toContain("COMPLETED");
});
