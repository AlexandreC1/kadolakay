import { describe, it, expect } from "vitest";
import { priceOrder, type PricedItemRow } from "./pricing";

const reg = { id: "r1", slug: "s", status: "PUBLISHED" };
const row = (o: Partial<PricedItemRow> & { id: string }): PricedItemRow => ({
  registryId: "r1", priceHTG: null, priceUSD: null, quantity: 5, fulfilledQty: 0, status: "AVAILABLE", registry: reg, ...o,
});
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as { code?: string }).code; } return "OK"; };

describe("priceOrder", () => {
  it("prices in the provider currency with exact decimals and a 5% fee", () => {
    const r = priceOrder({
      requestedIds: ["a", "b"], quantities: { a: 3 }, currency: "USD",
      rows: [row({ id: "a", priceUSD: "19.99" }), row({ id: "b", priceUSD: "0.10" })],
    });
    expect(r.total.toFixed(2)).toBe("60.07");
    expect(r.platformFee.toFixed(2)).toBe("3.00");
    expect(r.lines.map((l) => l.quantity)).toEqual([3, 1]);
  });
  it("C2: rejects an item with no price in the charged currency (USD-only item via MonCash)", () => {
    expect(code(() => priceOrder({
      requestedIds: ["cheap", "crib"], quantities: {}, currency: "HTG",
      rows: [row({ id: "cheap", priceHTG: "50" }), row({ id: "crib", priceUSD: "500" })],
    }))).toBe("INVALID_INPUT");
  });
  it("rejects missing items, mixed registries, unpublished registries, fulfilled items", () => {
    const a = row({ id: "a", priceUSD: "1" });
    expect(code(() => priceOrder({ requestedIds: ["a", "zz"], quantities: {}, currency: "USD", rows: [a] }))).toBe("NOT_FOUND");
    expect(code(() => priceOrder({ requestedIds: ["a", "b"], quantities: {}, currency: "USD",
      rows: [a, row({ id: "b", priceUSD: "1", registryId: "r2", registry: { id: "r2", slug: "x", status: "PUBLISHED" } })] }))).toBe("INVALID_INPUT");
    expect(code(() => priceOrder({ requestedIds: ["a"], quantities: {}, currency: "USD",
      rows: [row({ id: "a", priceUSD: "1", registry: { ...reg, status: "DRAFT" } })] }))).toBe("NOT_FOUND");
    expect(code(() => priceOrder({ requestedIds: ["a"], quantities: {}, currency: "USD",
      rows: [row({ id: "a", priceUSD: "1", status: "FULFILLED" })] }))).toBe("CONFLICT");
  });
  it("H5: clamps quantity to what is still needed and to the max", () => {
    const a = row({ id: "a", priceUSD: "1", quantity: 3, fulfilledQty: 2 });
    expect(code(() => priceOrder({ requestedIds: ["a"], quantities: { a: 2 }, currency: "USD", rows: [a] }))).toBe("INVALID_INPUT");
    expect(code(() => priceOrder({ requestedIds: ["a"], quantities: { a: 1 }, currency: "USD", rows: [a] }))).toBe("OK");
    expect(code(() => priceOrder({ requestedIds: ["a"], quantities: { a: 0 }, currency: "USD", rows: [a] }))).toBe("INVALID_INPUT");
  });
  it("de-duplicates repeated ids", () => {
    const r = priceOrder({ requestedIds: ["a", "a"], quantities: {}, currency: "USD", rows: [row({ id: "a", priceUSD: "2" })] });
    expect(r.total.toFixed(2)).toBe("2.00");
  });
});
