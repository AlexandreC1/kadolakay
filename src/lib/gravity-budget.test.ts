import { describe, expect, it } from "vitest";
import { gravityCanvasScale, gravityStarCount } from "./gravity-budget";

describe("decorative background rendering budget", () => {
  it("limits particle work even with oversized or invalid configuration", () => {
    expect(gravityStarCount(320, 10000)).toBe(32);
    expect(gravityStarCount(1440, 10000)).toBe(70);
    expect(gravityStarCount(320, -1)).toBe(0);
    expect(gravityStarCount(320, NaN)).toBe(0);
  });
  it.each([[320, 740, 3], [1440, 900, 2], [3840, 2160, 2], [7680, 4320, 3]])("caps pixel allocation at %sx%s DPR%s", (width, height, ratio) => {
    const scale = gravityCanvasScale(width, height, ratio);
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThanOrEqual(1.5);
    expect(Math.floor(width * scale) * Math.floor(height * scale)).toBeLessThanOrEqual(2500000);
  });
});
