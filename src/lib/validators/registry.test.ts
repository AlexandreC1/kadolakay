import { describe, it, expect } from "vitest";
import { addItemSchema, updateItemSchema, createRegistrySchema, updateRegistrySchema } from "./registry";
import { canViewRegistry } from "./registry-access";

describe("registry validators", () => {
  it("rejects javascript: links on create AND update", () => {
    expect(addItemSchema.safeParse({ title: "x", externalUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(updateItemSchema.safeParse({ externalUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(createRegistrySchema.safeParse({ type: "WEDDING", title: "ab", amazonWishlistUrl: "javascript:x" }).success).toBe(false);
  });
  it("users can't create LOCAL_BUSINESS items or link businesses", () => {
    expect(addItemSchema.safeParse({ title: "x", source: "LOCAL_BUSINESS" }).success).toBe(false);
    const r = addItemSchema.parse({ title: "x", businessId: "b1", productId: "p1" });
    expect(r).not.toHaveProperty("businessId");
  });
  it("update is strict (no mass assignment) and validates numbers", () => {
    expect(updateItemSchema.safeParse({ fulfilledQty: 99 }).success).toBe(false);
    expect(updateItemSchema.safeParse({ quantity: "abc" }).success).toBe(false);
    expect(updateItemSchema.parse({ quantity: "3", priceUSD: "19.99" })).toEqual({ quantity: 3, priceUSD: 19.99 });
    expect(updateRegistrySchema.safeParse({ status: "PUBLISHED" }).success).toBe(false);
  });
  it("rejects invalid or absurd event dates", () => {
    const base = { type: "WEDDING", title: "ab" };
    expect(createRegistrySchema.safeParse({ ...base, eventDate: "not-a-date" }).success).toBe(false);
    expect(createRegistrySchema.safeParse({ ...base, eventDate: "1999-01-01" }).success).toBe(false);
    const next = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    expect(createRegistrySchema.safeParse({ ...base, eventDate: next }).success).toBe(true);
  });
});

describe("canViewRegistry (M3)", () => {
  const pub = { status: "PUBLISHED", isPublic: true, shareToken: "tok_abcdefghijkl" };
  it("public published: anyone; drafts: owner only", () => {
    expect(canViewRegistry(pub, { isOwner: false })).toBe(true);
    expect(canViewRegistry({ ...pub, status: "DRAFT" }, { isOwner: false })).toBe(false);
    expect(canViewRegistry({ ...pub, status: "DRAFT" }, { isOwner: true })).toBe(true);
  });
  it("private: owner or exact share token", () => {
    const priv = { ...pub, isPublic: false };
    expect(canViewRegistry(priv, { isOwner: false })).toBe(false);
    expect(canViewRegistry(priv, { isOwner: false, shareToken: "wrong" })).toBe(false);
    expect(canViewRegistry(priv, { isOwner: false, shareToken: "tok_abcdefghijkl" })).toBe(true);
    expect(canViewRegistry(priv, { isOwner: true })).toBe(true);
  });
});
