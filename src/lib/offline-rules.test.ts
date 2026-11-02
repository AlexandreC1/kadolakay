import { describe, it, expect } from "vitest";
import {
  campaignSchema,
  haitiMidnight,
  inclusiveCampaignEnd,
  activeCampaign,
} from "./campaign";
import { selectGiftBundle, discoverySchema } from "./gift-discovery";
import { registryGrantValid, createRegistryGrant } from "./registry-access";
import { toMinorUnits } from "@/services/money";
describe("campaign scheduling and bounded budget selections", () => {
  it("uses Haiti midnight and inclusive ends across daylight saving changes", () => {
    expect(haitiMidnight("2026-03-07").toISOString()).toBe(
      "2026-03-07T05:00:00.000Z",
    );
    expect(haitiMidnight("2026-03-09").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
    expect(inclusiveCampaignEnd("2026-03-08").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
  });
  it("rejects impossible dates and sales attached to commemorations", () => {
    const base = {
      titleEN: "Test",
      titleFR: "Test",
      titleHT: "Test",
      season: "everyday",
      kind: "COMMEMORATION",
      occasion: "ANY",
      startDate: "2026-01-01",
      endDate: "2026-01-01",
      priority: 0,
      enabled: true,
    };
    expect(campaignSchema.safeParse(base).success).toBe(true);
    expect(
      campaignSchema.safeParse({ ...base, startDate: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      campaignSchema.safeParse({ ...base, occasion: "BIRTHDAY" }).success,
    ).toBe(false);
    expect(
      campaignSchema.safeParse({ ...base, endDate: "2028-01-01" }).success,
    ).toBe(false);
  });
  it("selects overlaps deterministically and excludes the end instant", () => {
    const a = {
      id: "a",
      season: "everyday",
      kind: "GIFTING",
      occasion: "ANY",
      titleEN: "A",
      titleFR: "A",
      titleHT: "A",
      priority: 2,
      startsAt: new Date("2026-01-01"),
      endsAt: new Date("2026-01-03"),
    };
    expect(
      activeCampaign([{ ...a, id: "b" }, a], new Date("2026-01-02"))?.id,
    ).toBe("a");
    expect(activeCampaign([a], a.endsAt)).toBeUndefined();
  });
  it("keeps every whole-selection total within the exact budget with unique gifts", () => {
    const candidates = Array.from({ length: 96 }, (_, i) => ({
      id: String(i),
      businessId: String(i % 5),
      category: i % 2 ? "home" : "flowers",
      amount: ((i + 1) * 0.37).toFixed(2),
    }));
    for (const budget of ["0.01", "1", "10.01", "100", "999.99"]) {
      const input = {
        budget,
        currency: "USD" as const,
        occasion: "VALENTINE" as const,
        budgetMode: "basket" as const,
        maxGifts: 6,
      };
      const result = selectGiftBundle(candidates, input);
      expect(result.length).toBeLessThanOrEqual(6);
      expect(new Set(result.map((i) => i.id)).size).toBe(result.length);
      expect(
        result.reduce((s, i) => s + toMinorUnits(i.amount), 0),
      ).toBeLessThanOrEqual(toMinorUnits(budget));
      expect(selectGiftBundle(candidates, input)).toEqual(result);
    }
  });
  it("rejects unbounded bundle inputs and ignores invalid prices", () => {
    expect(discoverySchema.safeParse({ maxGifts: 100 }).success).toBe(false);
    expect(discoverySchema.safeParse({ maxGifts: "1e2" }).success).toBe(false);
    expect(
      selectGiftBundle(
        [{ id: "bad", businessId: "x", category: null, amount: "-1" }],
        { budget: "10", currency: "USD", occasion: "ANY" },
      ),
    ).toEqual([]);
  });
});
describe("password access grants", () => {
  it("binds grants to list, current hash and expiration", () => {
    process.env.AUTH_SECRET = "test-only-secret-with-more-than-32-characters";
    const now = 1000000,
      grant = createRegistryGrant("one", "hash-a", now);
    expect(registryGrantValid(grant, "one", "hash-a", now)).toBe(true);
    expect(registryGrantValid(grant, "two", "hash-a", now)).toBe(false);
    expect(registryGrantValid(grant, "one", "hash-b", now)).toBe(false);
    expect(registryGrantValid(grant + "x", "one", "hash-a", now)).toBe(false);
    expect(registryGrantValid(grant, "one", "hash-a", now + 1800000)).toBe(
      false,
    );
  });
});
