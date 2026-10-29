import { describe, expect, it } from "vitest";
import { addProductSchema, patenteNumberSchema, registerBusinessSchema } from "./business";

describe("merchant physical stock", () => {
  it.each([-1, 0.5, 1000001, Infinity, NaN, "2", { increment: 1 }])("rejects invalid or injected counts: %s", stockQuantity => {
    expect(addProductSchema.safeParse({ name: "Gift", priceUSD: 10, stockQuantity }).success).toBe(false);
  });
  it("accepts zero and preserves unknown as distinct from sold out", () => {
    expect(addProductSchema.parse({ name: "Gift", priceUSD: 10, stockQuantity: 0 }).stockQuantity).toBe(0);
    expect(addProductSchema.parse({ name: "Gift", priceUSD: 10, stockQuantity: null }).stockQuantity).toBeNull();
    expect(addProductSchema.safeParse({ name: "Gift", priceUSD: 10, stockQuantity: 2, reservedStock: 0 }).success).toBe(false);
  });
});
describe("business patente input", () => {
  it("preserves leading zeroes and printed separators across repeated validation", () => {
    const data = registerBusinessSchema.parse({ name: "Test shop", category: "home", patenteNumber: "  00123 / 2026-A  " });
    expect(data.patenteNumber).toBe("00123 / 2026-A");
    expect(registerBusinessSchema.parse(data)).toEqual(data);
  });
  it("keeps existing applications valid and normalizes an omitted number", () => {
    expect(registerBusinessSchema.parse({ name: "Test shop", category: "home" }).patenteNumber).toBeUndefined();
    expect(patenteNumberSchema.parse("   ")).toBeNull();
    expect(patenteNumberSchema.parse(patenteNumberSchema.parse(""))).toBeNull();
  });
  it.each(["x".repeat(101), "<script>alert(1)</script>", "123\n456", 1234, { contains: "1234" }])("rejects unsafe, excessive or non-text identifiers: %s", value => {
    expect(patenteNumberSchema.safeParse(value).success).toBe(false);
  });
  it("never permits submitted approval or owner assignment", () => {
    expect(registerBusinessSchema.safeParse({ name: "Test shop", category: "home", patenteNumber: "00123", status: "APPROVED" }).success).toBe(false);
    expect(registerBusinessSchema.safeParse({ name: "Test shop", category: "home", ownerId: "someone-else" }).success).toBe(false);
  });
});
