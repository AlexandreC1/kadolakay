import { describe, expect, it } from "vitest";
import { contactPageCopy, legalShared, privacyCopy, supportEmail, termsCopy } from "./legal-copy";

const locales = ["ht", "fr", "en"] as const;

describe("legal copy", () => {
  it("has the same structure in every language", () => {
    for (const doc of [privacyCopy, termsCopy]) {
      const shape = (l: string) => doc(l).sections.map((s) => s.body.length);
      for (const locale of locales) {
        expect(shape(locale)).toEqual(shape("en"));
        expect(doc(locale).title.trim()).not.toBe("");
      }
    }
    for (const locale of locales) {
      expect(Object.keys(contactPageCopy(locale))).toEqual(Object.keys(contactPageCopy("en")));
      expect(legalShared(locale).draft).toBeTruthy();
    }
  });
  it("falls back to English for unknown locales", () => {
    expect(privacyCopy("xx").title).toBe(privacyCopy("en").title);
  });
  it("never invents a support address or uses em dashes", () => {
    const all = JSON.stringify(locales.map((l) => [privacyCopy(l), termsCopy(l), contactPageCopy(l), legalShared(l)]));
    expect(all).not.toMatch(/@/);
    expect(all).not.toMatch(/—|–/);
  });
  it("reads the support address only from configuration", () => {
    expect(supportEmail({})).toBeNull();
    expect(supportEmail({ SUPPORT_EMAIL: "not an email" })).toBeNull();
    expect(supportEmail({ SUPPORT_EMAIL: " help@example.org " })).toBe("help@example.org");
  });
});
