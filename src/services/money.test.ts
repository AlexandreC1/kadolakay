import { describe, it, expect } from "vitest";
import { toMinorUnits, fromMinorUnits } from "./money";
import { checkoutSchema } from "@/lib/validators/checkout";
import { escapeHtml } from "@/lib/email";
const valid = { registrySlug: "baby", locale: "en", registryItemIds: ["i1"], quantities: { i1: 1 }, buyerName: "Buyer", buyerEmail: "buyer@example.com", paymentProvider: "stripe" };
describe("checkout boundary validation", () => {
  it("rejects unknown keys, inactive providers, duplicate IDs, and hidden quantity keys", () => {
    for (const invalid of [{ ...valid, userId: "admin" }, { ...valid, paymentProvider: "natcash" }, { ...valid, registryItemIds: ["i1", "i1"] }, { ...valid, quantities: { i1: 1, extra: 2 } }, { ...valid, quantities: { i1: 0 } }, { ...valid, quantities: { i1: 1.5 } }]) expect(checkoutSchema.safeParse(invalid).success).toBe(false);
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });
  it("uses exact minor units, not float multiplication", () => {
    expect(toMinorUnits("0.29")).toBe(29); expect(toMinorUnits("19.99") * 3).toBe(5997); expect(fromMinorUnits(5997)).toBe("59.97");
    for (const invalid of ["-1", "NaN", "1.999", "0", "1e3"]) expect(() => toMinorUnits(invalid)).toThrow();
  });
  it("escapes HTML in notification fields", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> &')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp;');
  });
});
