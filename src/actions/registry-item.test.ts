import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: { registryItem: { findUnique: m.find, update: m.update } } }));
const { updateRegistryItem } = await import("./registry-item");

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ user: { id: "owner" } });
  m.find.mockResolvedValue({ id: "i1", fulfilledQty: 2, registry: { userId: "owner", slug: "s" } });
});

describe("updateRegistryItem (H1)", () => {
  it("rejects a javascript: externalUrl", async () => {
    await expect(updateRegistryItem("i1", fd({ externalUrl: "javascript:alert(1)" }))).rejects.toThrow("Invalid item data");
    expect(m.update).not.toHaveBeenCalled();
  });
  it("ignores protected fields and validates numbers", async () => {
    await updateRegistryItem("i1", fd({ title: "Crib", fulfilledQty: "999", registryId: "other", quantity: "4" }));
    expect(m.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { title: "Crib", quantity: 4 } });
  });
  it("won't lower quantity below what was already gifted", async () => {
    await expect(updateRegistryItem("i1", fd({ quantity: "1" }))).rejects.toThrow(/already gifted/);
  });
  it("won't let the owner reprice or rename a business product", async () => {
    m.find.mockResolvedValue({ id: "i1", source: "LOCAL_BUSINESS", fulfilledQty: 0, registry: { userId: "owner", slug: "s" } });
    await expect(updateRegistryItem("i1", fd({ priceHTG: "1" }))).rejects.toThrow(/quantity/);
    await expect(updateRegistryItem("i1", fd({ title: "Cheap cake" }))).rejects.toThrow(/quantity/);
    expect(m.update).not.toHaveBeenCalled();
    await updateRegistryItem("i1", fd({ quantity: "3" }));
    expect(m.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { quantity: 3 } });
  });
  it("other users can't edit", async () => {
    m.auth.mockResolvedValue({ user: { id: "attacker" } });
    await expect(updateRegistryItem("i1", fd({ title: "x" }))).rejects.toThrow();
  });
});
