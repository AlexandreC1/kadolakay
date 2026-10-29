import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ many: vi.fn(), first: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { business: { findMany: mocks.many, findFirst: mocks.first } } }));
import { browseBusinessDirectory } from "./catalog-directory";
import { directoryHref, directorySchema } from "@/lib/directory";
describe("bounded merchant discovery", () => {
  beforeEach(() => { mocks.many.mockReset(); mocks.first.mockReset(); });
  it("rejects malformed filters and cursors", () => {
    for (const value of [{ q: "x".repeat(81) }, { q: ["one", "two"] }, { category: "unknown" }, { after: "../admin" }]) expect(directorySchema.safeParse(value).success).toBe(false);
  });
  it("preserves filters in next-page links and resets the cursor on restart", () => {
    const input = { q: "Jean & Rose", category: "home" as const, after: "old" };
    expect(directoryHref(input,"next")).toBe("/browse?q=Jean+%26+Rose&category=home&after=next");
    expect(directoryHref(input)).toBe("/browse?q=Jean+%26+Rose&category=home");
  });
  it("fetches a fixed-size page with public fields and a bounded product preview", async () => {
    mocks.many.mockResolvedValue(Array.from({ length: 13 }, (_, i) => ({ id: `merchant-${i}`, name: `Shop ${i}`, slug: `shop-${i}`, category: "home", city: "Jacmel", description: null, coverUrl: "javascript:alert(1)", products: [], _count: { products: 4 }, ownerEmail: "private@example.com" })));
    const result = await browseBusinessDirectory({ q: "", category: "" });
    expect(result.items).toHaveLength(12); expect(result.next).toBe("merchant-11");
    expect(result.items[0]).not.toHaveProperty("ownerEmail"); expect(result.items[0].coverUrl).toBeNull();
    const args = mocks.many.mock.calls[0][0];
    expect(args.take).toBe(13); expect(args.skip).toBeUndefined();
    expect(args.where.AND[0].status).toBe("APPROVED");
    expect(args.select.products.take).toBe(3); expect(args.select.products.where).toEqual({ inStock: true });
  });
  it("restarts safely when a cursor merchant has disappeared or no longer matches", async () => {
    mocks.first.mockResolvedValue(null);
    expect(await browseBusinessDirectory({ q: "", category: "", after: "removed" })).toEqual({ status: "expired", items: [], next: null });
    expect(mocks.many).not.toHaveBeenCalled();
  });
  it("uses a name/id boundary rather than increasingly deep offsets", async () => {
    mocks.first.mockResolvedValue({ id: "cursor", name: "Shop" }); mocks.many.mockResolvedValue([]);
    await browseBusinessDirectory({ q: "Port", category: "home", after: "cursor" });
    expect(mocks.many.mock.calls[0][0].where.AND[1]).toEqual({ OR: [{ name: { gt: "Shop" } }, { name: "Shop", id: { gt: "cursor" } }] });
  });
});
