import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "./utils";

describe("generateOrderNumber (H3)", () => {
  it("has a date and 10 Crockford base32 chars", () => {
    expect(generateOrderNumber(new Date("2026-10-12T12:00:00Z"))).toMatch(/^KL-20261012-[0-9A-HJKMNP-TV-Z]{10}$/);
  });
  it("does not collide in 20k draws (the old 4-char version did at ~1.3k)", () => {
    const s = new Set(Array.from({ length: 20000 }, () => generateOrderNumber()));
    expect(s.size).toBe(20000);
  });
});
