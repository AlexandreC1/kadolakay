import { describe, expect, it } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("accepts the three known themes", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("system")).toBe("system");
  });

  it("falls back to dark for missing or unknown values", () => {
    expect(parseTheme(undefined)).toBe("dark");
    expect(parseTheme("neon")).toBe("dark");
    expect(parseTheme('"><script>')).toBe("dark");
  });
});
