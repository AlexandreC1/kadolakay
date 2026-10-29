import { describe, expect, it } from "vitest";
import { giftQuantities, giftState, matchesGiftFilter, registryProgress } from "./registry-progress";
describe("registry quantity progress", () => {
  it("does not count temporary holds as completed purchases", () => {
    expect(registryProgress([{ quantity: 3, fulfilledQty: 1, availableQty: 1 }])).toEqual({ requested: 3, confirmed: 1, available: 1, held: 1, percent: 33 });
  });
  it("uses units rather than counting rows as complete", () => {
    expect(registryProgress([{ quantity: 9, fulfilledQty: 0, availableQty: 9 }, { quantity: 1, fulfilledQty: 1, availableQty: 0 }]).percent).toBe(10);
  });
  it("handles an empty wishlist without NaN or fake progress", () => expect(registryProgress([]).percent).toBe(0));
  it("bounds damaged counts so progress never exceeds the request", () => {
    expect(giftQuantities({ quantity: 2, fulfilledQty: 12, availableQty: 20 })).toEqual({ requested: 2, confirmed: 2, available: 0, held: 0 });
    expect(registryProgress([{ quantity: NaN, fulfilledQty: -1, availableQty: Infinity }]).percent).toBe(0);
  });
  it("keeps partially purchased gifts available and fully held gifts separate", () => {
    expect(giftState({ quantity: 3, fulfilledQty: 1, availableQty: 1 })).toBe("available");
    expect(giftState({ quantity: 3, fulfilledQty: 1, availableQty: 0 })).toBe("held");
    expect(giftState({ quantity: 3, fulfilledQty: 3, availableQty: 0 })).toBe("confirmed");
  });
  it("keeps multi-quantity gifts discoverable in every applicable filter", () => {
    const partial = { quantity: 3, fulfilledQty: 1, availableQty: 1 };
    expect(matchesGiftFilter(partial, "available")).toBe(true);
    expect(matchesGiftFilter(partial, "held")).toBe(true);
    expect(matchesGiftFilter(partial, "confirmed")).toBe(true);
    expect(matchesGiftFilter({ quantity: 1, fulfilledQty: 1, availableQty: 0 }, "available")).toBe(false);
  });
});
