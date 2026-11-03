import { describe, expect, it } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("accepts the three known themes", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("system")).toBe("system");
  });

  it("falls back to system for missing or unknown values", () => {
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("neon")).toBe("system");
    expect(parseTheme('"><script>')).toBe("system");
  });
});
