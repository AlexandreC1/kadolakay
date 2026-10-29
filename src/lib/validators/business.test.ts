import { describe, expect, it } from "vitest";
import { patenteNumberSchema, registerBusinessSchema } from "./business";
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
