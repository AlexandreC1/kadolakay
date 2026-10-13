import { describe, expect, it } from "vitest";
import { pickLocale, privacy, terms } from "./content";

describe("legal content", () => {
  it("has the same sections in ht/fr/en", () => {
    for (const doc of [privacy, terms]) {
      const n = doc.en.sections.length;
      expect(doc.fr.sections).toHaveLength(n);
      expect(doc.ht.sections).toHaveLength(n);
      for (const l of ["ht", "fr", "en"] as const) for (const s of doc[l].sections) expect(s.body.length).toBeGreaterThan(0);
    }
  });
  it("mentions the 5% fee and every processor", () => {
    expect(terms.en.sections.map((s) => s.body.join(" ")).join(" ")).toContain("5%");
    const p = privacy.en.sections.map((s) => s.body.join(" ")).join(" ");
    for (const name of ["Vercel", "Neon", "Resend", "Stripe", "PayPal", "MonCash", "Natcash", "Cloudflare R2", "Sentry", "Upstash"]) expect(p).toContain(name);
  });
  it("unknown locale falls back to ht", () => {
    expect(pickLocale("de")).toBe("ht");
    expect(pickLocale("fr")).toBe("fr");
  });
});
