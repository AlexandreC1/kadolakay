import { beforeEach, describe, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { registry: { findFirst: query } } }));
import { previewSharedRegistry } from "./registry-finder";

describe("shared registry preview", () => {
  beforeEach(() => { query.mockReset(); });
  it.each([undefined, ["one", "two"], "", " ", "x".repeat(501), "https://evil.example/r/list", "javascript:alert(1)", "/r/list?token=secret"])("rejects malformed addresses before database access: %s", async input => {
    expect(await previewSharedRegistry(input, "https://kadolakay.example")).toEqual({ status: "invalid" });
    expect(query).not.toHaveBeenCalled();
  });
  it("queries only published, unprotected public lists with a minimal projection", async () => {
    query.mockResolvedValue(null);
    expect(await previewSharedRegistry("our-wedding", "https://kadolakay.example")).toEqual({ status: "missing" });
    expect(query).toHaveBeenCalledWith({ where: { slug: "our-wedding", status: "PUBLISHED", isPublic: true, password: null }, select: { slug: true, title: true, type: true, eventDate: true, _count: { select: { items: true } } } });
  });
  it("returns a preview without the underlying database record", async () => {
    query.mockResolvedValue({ slug: "our-wedding", title: "Our wedding", type: "WEDDING", eventDate: null, _count: { items: 0 }, password: "must-not-leak", userId: "must-not-leak" });
    expect(await previewSharedRegistry("/fr/r/our-wedding", "https://kadolakay.example")).toEqual({ status: "found", registry: { slug: "our-wedding", title: "Our wedding", type: "WEDDING", eventDate: null, giftCount: 0 } });
  });
  it("propagates database failures so the controller can show a retry message", async () => {
    query.mockImplementation(async () => { throw new Error("internal database detail"); });
    await expect(previewSharedRegistry("our-wedding", "https://kadolakay.example")).rejects.toMatchObject({ message: "internal database detail" });
  });
});
