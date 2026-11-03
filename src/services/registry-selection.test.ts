import { describe, it, expect, vi, beforeEach } from "vitest";
const m = vi.hoisted(() => ({
  lock: vi.fn(),
  user: vi.fn(),
  registry: vi.fn(),
  products: vi.fn(),
  existing: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (fn: (tx: object) => Promise<unknown>) =>
      fn({
        $queryRaw: m.lock,
        user: { findUnique: m.user },
        registry: { findUnique: m.registry },
        product: { findMany: m.products },
        registryItem: {
          findMany: m.existing,
          count: m.count,
          createMany: m.create,
        },
      }),
  },
}));
import { selectionSchema, saveRegistrySelection } from "./registry-selection";
beforeEach(() => {
  vi.clearAllMocks();
  m.lock.mockResolvedValue([{ id: "r" }]);
  m.user.mockResolvedValue({ bannedAt: null, deletedAt: null });
  m.registry.mockResolvedValue({ slug: "test", status: "DRAFT" });
  m.products.mockResolvedValue([
    { id: "p1", name: "Merchant price", priceUSD: "20.00", businessId: "b" },
  ]);
  m.existing.mockResolvedValue([]);
  m.count.mockResolvedValue(0);
});
describe("registry multi selection", () => {
  it("rejects client prices, owner spoofing, empty and over-limit selection", () => {
    for (const value of [
      { registryId: "r", productIds: [], userId: "other" },
      { registryId: "r", productIds: ["p1"], priceUSD: 1 },
      { registryId: "r", productIds: Array(51).fill("p") },
    ])
      expect(selectionSchema.safeParse(value).success).toBe(false);
  });
  it("deduplicates IDs and copies authoritative merchant data", async () => {
    expect(
      await saveRegistrySelection("owner", {
        registryId: "r",
        productIds: ["p1", "p1"],
      }),
    ).toMatchObject({ added: 1 });
    expect(m.create.mock.calls[0][0].data[0]).toMatchObject({
      title: "Merchant price",
      priceUSD: "20.00",
      source: "LOCAL_BUSINESS",
      quantity: 1,
    });
  });
  it("does not add an already present gift again", async () => {
    m.existing.mockResolvedValue([{ productId: "p1" }]);
    expect(
      await saveRegistrySelection("owner", {
        registryId: "r",
        productIds: ["p1"],
      }),
    ).toMatchObject({ added: 0, existing: 1 });
    expect(m.create).not.toHaveBeenCalled();
  });
  it("rejects wrong ownership before reading products", async () => {
    m.lock.mockResolvedValue([]);
    await expect(
      saveRegistrySelection("other", { registryId: "r", productIds: ["p1"] }),
    ).rejects.toThrow("forbidden");
    expect(m.products).not.toHaveBeenCalled();
  });
  it("rejects banned users and archived registries", async () => {
    m.user.mockResolvedValue({ bannedAt: new Date() });
    await expect(
      saveRegistrySelection("owner", { registryId: "r", productIds: ["p1"] }),
    ).rejects.toThrow("forbidden");
    m.user.mockResolvedValue({ bannedAt: null });
    m.registry.mockResolvedValue({ status: "ARCHIVED" });
    await expect(
      saveRegistrySelection("owner", { registryId: "r", productIds: ["p1"] }),
    ).rejects.toThrow("forbidden");
  });
  it("rejects the entire batch if one selected product is unavailable", async () => {
    await expect(
      saveRegistrySelection("owner", {
        registryId: "r",
        productIds: ["p1", "missing"],
      }),
    ).rejects.toThrow("unavailable");
    expect(m.create).not.toHaveBeenCalled();
  });
  it("enforces a bounded registry", async () => {
    m.count.mockResolvedValue(500);
    await expect(
      saveRegistrySelection("owner", { registryId: "r", productIds: ["p1"] }),
    ).rejects.toThrow("limit");
    expect(m.create).not.toHaveBeenCalled();
  });
});
