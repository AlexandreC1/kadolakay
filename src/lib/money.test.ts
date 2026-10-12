import { describe, it, expect } from "vitest";
import { money, moneyOrNull, sum, multiply, percentOf, toMinorUnits, fromMinorUnits, toFixed2, isPositive } from "./money";

describe("money", () => {
  it("avoids float error", () => {
    expect(toFixed2(sum([money("0.1"), money("0.2")]))).toBe("0.30");
    expect(0.1 + 0.2).not.toBe(0.3); // the bug this module exists for
  });
  it("rounds half-up to 2 places", () => {
    expect(toFixed2(money("1.005"))).toBe("1.01");
    expect(toFixed2(money(2.675))).toBe("2.68");
  });
  it("rejects NaN / Infinity / garbage", () => {
    expect(() => money(NaN)).toThrow();
    expect(() => money(Infinity)).toThrow();
    expect(() => money("abc")).toThrow();
  });
  it("multiplies by integer quantities only", () => {
    expect(toFixed2(multiply(money("19.99"), 3))).toBe("59.97");
    expect(() => multiply(money(1), 1.5)).toThrow();
    expect(() => multiply(money(1), -1)).toThrow();
  });
  it("computes the 5% platform fee", () => {
    expect(toFixed2(percentOf(money("123.45"), 5))).toBe("6.17");
  });
  it("converts to and from minor units", () => {
    expect(toMinorUnits(money("19.99"))).toBe(1999);
    expect(toFixed2(fromMinorUnits(1999))).toBe("19.99");
    expect(() => fromMinorUnits(1.5)).toThrow();
  });
  it("handles nullable columns and positivity", () => {
    expect(moneyOrNull(null)).toBeNull();
    expect(moneyOrNull(undefined)).toBeNull();
    expect(isPositive(money(0))).toBe(false);
    expect(isPositive(null)).toBe(false);
    expect(isPositive(money("0.01"))).toBe(true);
  });
});
