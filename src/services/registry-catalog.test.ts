import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), lock: vi.fn(), registry: vi.fn(), duplicate: vi.fn(), products: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
import { addCatalogGifts } from "./registry-catalog";

const selection = { registryId: "registry", productIds: ["gift-a", "gift-b"] };
const gift = (id: string) => ({ id, name: id, description: null, imageUrl: null, priceUSD: "19.99", priceHTG: null, businessId: "merchant" });

describe("atomic catalog selection boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(operation => operation({ $queryRaw: mocks.lock, registry: { findFirst: mocks.registry }, registryItem: { findFirst: mocks.duplicate, createMany: mocks.insert }, product: { findMany: mocks.products } }));
    mocks.registry.mockResolvedValue({ id: "registry" });
    mocks.duplicate.mockResolvedValue(null);
    mocks.products.mockResolvedValue([gift("gift-a"), gift("gift-b")]);
    mocks.insert.mockResolvedValue({ count: 2 });
  });
  it.each([
    { ...selection, productIds: [] },
    { ...selection, productIds: Array.from({ length: 21 }, (_, index) => `gift-${index}`) },
    { ...selection, productIds: ["gift-a", "gift-a"] },
    { ...selection, productIds: [{ not: "gift-a" }] },
    { ...selection, priceUSD: "0.01" },
    { ...selection, userId: "another-owner" },
    { ...selection, registryId: { not: "registry" } },
  ])("rejects malformed, duplicated or client-controlled selection before database access: %j", async input => {
    await expect(addCatalogGifts("owner", input)).rejects.toThrow("INVALID_SELECTION");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("does not inspect or add catalog gifts when registry ownership fails", async () => {
    mocks.registry.mockResolvedValue(null);
    await expect(addCatalogGifts("other-owner", selection)).rejects.toThrow("REGISTRY_UNAVAILABLE");
    expect(mocks.products).not.toHaveBeenCalled(); expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects the entire selection if a selected product is already on the registry", async () => {
    mocks.duplicate.mockResolvedValue({ id: "existing-item" });
    await expect(addCatalogGifts("owner", selection)).rejects.toThrow("GIFT_ALREADY_ADDED");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not insert the valid subset when another selected gift is unavailable", async () => {
    mocks.products.mockResolvedValue([gift("gift-a")]);
    await expect(addCatalogGifts("owner", selection)).rejects.toThrow("PRODUCT_UNAVAILABLE");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it.each([null, "0", "-2.00", "1.001", "10000000.00"])("refuses an invalid/unpriced catalog row instead of accepting a partial batch (%s)", async price => {
    mocks.products.mockResolvedValue([gift("gift-a"), { ...gift("gift-b"), priceUSD: price }]);
    await expect(addCatalogGifts("owner", selection)).rejects.toThrow("PRODUCT_UNAVAILABLE");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("snapshots independent catalog currencies without conversion or client pricing", async () => {
    mocks.products.mockResolvedValue([{ ...gift("gift-a"), priceUSD: "19.99", priceHTG: "2700.50" }, { ...gift("gift-b"), priceUSD: null, priceHTG: "1550" }]);
    expect(await addCatalogGifts("owner", selection)).toEqual({ addedCount: 2 });
    const rows = mocks.insert.mock.calls[0][0].data;
    expect(rows.map((row: { priceUSD: string | null; priceHTG: string }) => [row.priceUSD, row.priceHTG])).toEqual([["19.99", "2700.50"], [null, "1550"]]);
    expect(rows.every((row: { source: string; businessId: string }) => row.source === "LOCAL_BUSINESS" && row.businessId === "merchant")).toBe(true);
  });
  it("accepts the bounded maximum of twenty different gifts", async () => {
    const products = Array.from({ length: 20 }, (_, index) => gift(`gift-${index}`));
    mocks.products.mockResolvedValue(products); mocks.insert.mockResolvedValue({ count: 20 });
    expect(await addCatalogGifts("owner", { registryId: "registry", productIds: products.map(product => product.id) })).toEqual({ addedCount: 20 });
  });
});
