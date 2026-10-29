import { describe, it, expect, vi } from "vitest";

const find = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ db: { registry: { findUnique: find }, business: { findUnique: find } } }));
const { generateSlug, generateUniqueSlug } = await import("./slug");

describe("slugs (L5)", () => {
  it("strips accents and specials", () => {
    expect(generateSlug("Maryaj Jèn & Pòl!")).toBe("maryaj-jen-pol");
  });
  it("falls back when the title has no latin chars", async () => {
    find.mockResolvedValue(null);
    expect(generateSlug("🎉🎂")).toBe("");
    expect(await generateUniqueSlug("🎉🎂", "registry")).toMatch(/^registry-[a-z2-9]{6}$/);
  });
  it("uses a random suffix on collision and never loops forever", async () => {
    find.mockReset().mockResolvedValueOnce({ id: "x" }).mockResolvedValue(null);
    expect(await generateUniqueSlug("Fèt Marie", "registry")).toMatch(/^fet-marie-[a-z2-9]{6}$/);
    find.mockReset().mockResolvedValue({ id: "x" });
    expect(await generateUniqueSlug("Fèt Marie", "registry")).toMatch(/^fet-marie-[a-z2-9]{10}$/);
    expect(find).toHaveBeenCalledTimes(5);
  });
});
