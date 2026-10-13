import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  order: { findMany: vi.fn() },
  registry: { findMany: vi.fn() },
  registryItem: { groupBy: vi.fn() },
  product: { findMany: vi.fn() },
  business: { findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { getPlacedOrders, getReceivedOrders, PAID_LIKE } from "./orders";
import { getMyRegistriesPage } from "./registries";
import { browseProducts, getBrowseBusinesses, productSearchWhere } from "./browse";

beforeEach(() => vi.clearAllMocks());
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id${i}` }));

describe("orders queries", () => {
  it("received: paid-like orders of MY registries, bounded, cursor", async () => {
    db.order.findMany.mockResolvedValueOnce(rows(21));
    const page = await getReceivedOrders("u1", { take: 20, cursor: "c1" });
    const args = db.order.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ status: { in: [...PAID_LIKE] }, registry: { userId: "u1" } });
    expect(args).toMatchObject({ take: 21, skip: 1, cursor: { id: "c1" } });
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBe("id19");
  });
  it("placed: buyerId = me, any status", async () => {
    db.order.findMany.mockResolvedValueOnce(rows(3));
    const page = await getPlacedOrders("u1", { take: 20 });
    expect(db.order.findMany.mock.calls[0][0].where).toEqual({ buyerId: "u1" });
    expect(page.nextCursor).toBeNull();
  });
  it("never selects buyer email/phone for list views", async () => {
    db.order.findMany.mockResolvedValueOnce([]);
    await getReceivedOrders("u1", { take: 5 });
    const sel = db.order.findMany.mock.calls[0][0].select;
    expect(sel.buyerEmail).toBeUndefined();
    expect(sel.buyerPhone).toBeUndefined();
  });
});

describe("my registries", () => {
  it("uses _count + groupBy instead of loading items", async () => {
    db.registry.findMany.mockResolvedValueOnce([
      { id: "r1", _count: { items: 5 } },
      { id: "r2", _count: { items: 0 } },
    ]);
    db.registryItem.groupBy.mockResolvedValueOnce([{ registryId: "r1", _count: { _all: 2 } }]);
    const page = await getMyRegistriesPage("u1", { take: 20 });
    expect(db.registry.findMany.mock.calls[0][0].select.items).toBeUndefined();
    expect(page.items).toEqual([
      { id: "r1", totalItems: 5, fulfilledItems: 2 },
      { id: "r2", totalItems: 0, fulfilledItems: 0 },
    ]);
  });
  it("skips groupBy on an empty page", async () => {
    db.registry.findMany.mockResolvedValueOnce([]);
    await getMyRegistriesPage("u1", { take: 20 });
    expect(db.registryItem.groupBy).not.toHaveBeenCalled();
  });
});

describe("browse", () => {
  it("product search is case-insensitive on product or business name", () => {
    expect(productSearchWhere("bl").OR).toEqual([
      { name: { contains: "bl", mode: "insensitive" } },
      { business: { name: { contains: "bl", mode: "insensitive" } } },
    ]);
    expect(productSearchWhere().OR).toBeUndefined();
    expect(productSearchWhere()).toMatchObject({ inStock: true, deletedAt: null, business: { status: "APPROVED" } });
  });
  it("paginates products and maps Decimal to number", async () => {
    db.product.findMany.mockResolvedValueOnce([
      { id: "p1", name: "A", priceHTG: "100.5", priceUSD: null, business: { name: "B" } },
    ]);
    const r = await browseProducts({ take: 50 });
    expect(db.product.findMany.mock.calls[0][0].take).toBe(51);
    expect(r.items[0]).toMatchObject({ priceHTG: 100.5, priceUSD: null, businessName: "B" });
  });
  it("businesses: approved only, stable order", async () => {
    db.business.findMany.mockResolvedValueOnce([]);
    await getBrowseBusinesses({ take: 24 });
    const a = db.business.findMany.mock.calls[0][0];
    expect(a.where).toEqual({ status: "APPROVED" });
    expect(a.orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
  });
});
