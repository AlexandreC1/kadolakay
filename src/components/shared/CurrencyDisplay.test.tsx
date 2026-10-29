import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CurrencyDisplay } from "./CurrencyDisplay";
describe("catalog price display", () => {
  it("preserves a legitimate zero price instead of treating it as missing", () => {
    expect(renderToStaticMarkup(createElement(CurrencyDisplay, { priceUSD: 0 }))).toContain("0.00");
  });
  it("does not invent a price for an unpriced wishlist gift", () => {
    expect(renderToStaticMarkup(createElement(CurrencyDisplay, { priceUSD: null, priceHTG: null }))).toBe("");
  });
});
