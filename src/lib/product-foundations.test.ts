import { describe, it, expect } from "vitest";
import { currentSeason, parseSeasonPreference, premiumActive } from "./seasons";
import { discoverySchema, rankGifts } from "./gift-discovery";
import {
  assertPaymentEvidence,
  createMerchantPayment,
  merchantPaymentRequestSchema,
} from "@/services/payment-foundation";
import { getPaymentProvider } from "@/lib/payments";

describe("Haiti calendar and expiring entitlements", () => {
  it.each([
    ["2027-02-01T05:00:00Z", "valentine"],
    ["2027-02-15T05:00:00Z", "everyday"],
    ["2026-12-01T05:00:00Z", "christmas"],
    ["2026-12-26T05:00:00Z", "everyday"],
    ["2027-01-01T04:59:59Z", "everyday"],
    ["2027-01-01T05:00:00Z", "independence"],
    ["2027-05-18T04:00:00Z", "flag"],
    ["2026-11-18T05:00:00Z", "vertieres"],
  ])("resolves %s as %s", (date, season) =>
    expect(currentSeason(new Date(date))).toBe(season),
  );
  it("honors opt-out and invalid date fallback", () => {
    expect(currentSeason(new Date("2027-02-10"), "off")).toBe("everyday");
    expect(currentSeason(new Date("invalid"))).toBe("everyday");
    expect(parseSeasonPreference("<script>")).toBe("auto");
  });
  it("expires at the exact instant, independent of roles and cookies", () => {
    const now = new Date("2027-01-01");
    expect(premiumActive(null, now)).toBe(false);
    expect(premiumActive({ expiresAt: now }, now)).toBe(false);
    expect(premiumActive({ expiresAt: new Date(now.getTime() + 1) }, now)).toBe(
      true,
    );
    expect(premiumActive({ expiresAt: new Date("invalid") }, now)).toBe(false);
  });
});
describe("explainable budget discovery", () => {
  it.each(["0", "-1", "1.001", "NaN", "1e3", "1000001", "", "1,50"])(
    "rejects invalid budget %s",
    (budget) =>
      expect(discoverySchema.safeParse({ budget }).success).toBe(false),
  );
  it("rejects injected filters and repeated parameter arrays", () => {
    expect(discoverySchema.safeParse({ budget: ["10", "20"] }).success).toBe(
      false,
    );
    expect(
      discoverySchema.safeParse({ budget: "50", businessStatus: "SUSPENDED" })
        .success,
    ).toBe(false);
  });
  it("never exceeds budget and prioritizes known occasion matches", () => {
    const input = discoverySchema.parse({ budget: "50", occasion: "WEDDING" });
    const result = rankGifts(
      [
        { id: "a", businessId: "b", category: "beauty", amount: "49.99" },
        { id: "b", businessId: "b", category: "home", amount: "40.00" },
        { id: "c", businessId: "b", category: "home", amount: "50.01" },
        { id: "d", businessId: "b", category: "home", amount: "0" },
      ],
      input,
    );
    expect(result.map((p) => p.id)).toEqual(["b", "a"]);
    expect(result[0].reason).toBe("occasion");
    expect(result[1].reason).toBe("budget");
  });
  it("bounds output and diversifies merchants without duplicating gifts", () => {
    const candidates = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      businessId: i < 30 ? "one" : "two",
      category: "home",
      amount: "25",
    }));
    const result = rankGifts(candidates, discoverySchema.parse({}));
    expect(result).toHaveLength(12);
    expect(new Set(result.map((p) => p.id)).size).toBe(12);
    expect(
      result.slice(0, 6).filter((p) => p.businessId === "two"),
    ).toHaveLength(3);
  });
});
describe("merchant-direct payment boundary", () => {
  it("cannot use the retired platform adapters as a merchant-payment shortcut",()=>{
    for(const provider of ["stripe","moncash","natcash","paypal"] as const)expect(()=>getPaymentProvider(provider)).toThrow("LEGACY_PAYMENT_ADAPTER_DISABLED");
  });
  const request = {
    orderId: "order",
    merchantId: "merchant",
    merchantRecipient: "verified-provider-account",
    currency: "HTG" as const,
    amountMinor: 1050,
    idempotencyKey: "0123456789abcdef",
  };
  it("fails closed without an implemented provider even with valid money", async () => {
    await expect(createMerchantPayment(request)).rejects.toThrow(
      "NOT_CONFIGURED",
    );
  });
  it.each([0, -1, 10.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    "rejects invalid minor-unit amount %s",
    (amountMinor) =>
      expect(
        merchantPaymentRequestSchema.safeParse({ ...request, amountMinor })
          .success,
      ).toBe(false),
  );
  it("rejects unexpected settlement overrides", () =>
    expect(
      merchantPaymentRequestSchema.safeParse({
        ...request,
        platformAccount: "attacker",
      }).success,
    ).toBe(false));
  it("accepts exact verified server evidence and rejects substitutions", () => {
    const evidence = {
      state: "paid" as const,
      orderId: request.orderId,
      merchantRecipient: request.merchantRecipient,
      amountMinor: 1050,
      currency: "HTG" as const,
    };
    expect(() => assertPaymentEvidence(request, evidence)).not.toThrow();
    for (const altered of [
      { ...evidence, orderId: "another-order" },
      { ...evidence, merchantRecipient: "other" },
      { ...evidence, amountMinor: 1049 },
      { ...evidence, currency: "USD" as const },
      { ...evidence, state: "pending" as const },
    ])
      expect(() => assertPaymentEvidence(request, altered)).toThrow("MISMATCH");
  });
});
