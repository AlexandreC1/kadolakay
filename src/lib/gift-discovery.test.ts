import { describe, it, expect } from "vitest";
import { discoverySchema, discoveryWhere } from "./gift-discovery";
describe("gift discovery", () => {
  it("keeps exact decimal money and does not use currency conversions", () => {
    const filter = discoverySchema.parse({ currency: "USD", budget: "0.10" });
    expect(discoveryWhere(filter).AND).toContainEqual({
      priceUSD: { not: null, lte: "0.10" },
    });
  });
  it("rejects negative/NaN/scientific/oversized/overprecision money and unknown currency", () => {
    for (const budget of ["-1", "NaN", "1e2", "999999999", ".5", "1.001"])
      expect(discoverySchema.safeParse({ budget }).success).toBe(false);
    expect(discoverySchema.safeParse({ currency: "CAD" }).success).toBe(false);
  });
  it("restricts results to active inventory and approved active merchants", () => {
    expect(discoveryWhere(discoverySchema.parse({}))).toMatchObject({
      inStock: true,
      deletedAt: null,
      business: {
        status: "APPROVED",
        owner: { bannedAt: null, deletedAt: null },
      },
    });
  });
  it("combines search and occasion instead of widening budget matches", () => {
    const where = discoveryWhere(
      discoverySchema.parse({
        q: "crib",
        occasion: "BABY_SHOWER",
        budget: "100",
      }),
    );
    expect(where.AND).toHaveLength(3);
  });
});
