import { describe, expect, it } from "vitest";
import { appCopy } from "./app";
import { formatMoney } from "./money";

/** Every key in English exists in French and Creole, and no string is empty or uses an em dash. */
function walk(value: unknown, path: string, out: Map<string, unknown>) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, out);
  } else out.set(path, value);
  return out;
}

describe("app copy", () => {
  const en = walk(appCopy.en, "", new Map());
  for (const locale of ["fr", "ht"] as const) {
    it(`${locale} has every English key`, () => {
      const other = walk(appCopy[locale], "", new Map());
      expect([...en.keys()].filter((key) => !other.has(key))).toEqual([]);
    });
  }
  it("has no empty strings or em dashes", () => {
    for (const locale of ["en", "fr", "ht"] as const) {
      for (const [key, value] of walk(appCopy[locale], "", new Map())) {
        const text = typeof value === "function" ? String((value as (...a: unknown[]) => unknown)("2", "3")) : String(value);
        expect(text.trim(), `${locale}.${key}`).not.toBe("");
        expect(text, `${locale}.${key}`).not.toContain("—");
      }
    }
  });
});

describe("money", () => {
  it("formats gourdes with a space and drops whole cents", () => {
    expect(formatMoney(8750, "HTG", "fr")).toBe("8 750 HTG");
    expect(formatMoney(5425.5, "HTG", "fr")).toBe("5 425,50 HTG");
    expect(formatMoney(5425.5, "HTG", "en")).toBe("5 425.50 HTG");
    expect(formatMoney(50, "USD", "ht")).toBe("$50");
    expect(formatMoney(undefined, "USD", "en")).toBe("");
  });
});
