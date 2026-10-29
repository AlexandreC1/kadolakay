import { describe, it, expect } from "vitest";
import { updateProfileSchema } from "./user";

describe("updateProfileSchema", () => {
  it("turns empty fields into null and defaults the locale", () => {
    // FormData.get returns "" for an empty input and null for a missing one.
    const result = updateProfileSchema.parse({ name: "", phone: null });
    expect(result).toEqual({ name: null, phone: null, preferredLocale: "ht" });
  });

  it("trims and keeps real values", () => {
    const result = updateProfileSchema.parse({
      name: "  Marie  ",
      phone: "+509 3712-3456",
      preferredLocale: "fr",
    });
    expect(result).toEqual({ name: "Marie", phone: "+509 3712-3456", preferredLocale: "fr" });
  });

  it("rejects bad input", () => {
    expect(updateProfileSchema.safeParse({ preferredLocale: "es" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ phone: "call me" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });

  it("rejects fields it does not know", () => {
    expect(updateProfileSchema.safeParse({ name: "Marie", role: "ADMIN" }).success).toBe(false);
  });
});
