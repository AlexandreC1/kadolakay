import { describe, expect, it } from "vitest";
import { emailLocale, renderGiftNotification, renderOrderConfirmation, anonymousBuyer } from "./email";

const gift = { recipientName: "Marie", buyerName: "<b>Jean</b>", giftMessage: "Felisitasyon", itemNames: ["Crib & mattress"], registryTitle: "Baby", registrySlug: "baby list", orderNumber: "BY-1" };
const order = { buyerName: "Jean", itemNames: ["Crib"], registryTitle: "Baby", orderNumber: "BY-1", totalAmount: 25, currency: "USD" as const };

describe("transactional email language", () => {
  it("falls back to Kreyòl for unknown or missing locales", () => {
    expect(emailLocale("fr")).toBe("fr");
    expect(emailLocale("en")).toBe("en");
    for (const value of [null, undefined, "", "es", "FR"]) expect(emailLocale(value)).toBe("ht");
  });
  it("writes each email in the recipient's language and links to that locale", () => {
    expect(renderGiftNotification({ ...gift, locale: "fr" }).subject).toBe("Vous avez reçu un cadeau ! | Bayou");
    expect(renderGiftNotification({ ...gift, locale: "en" }).text).toContain("Hello Marie!");
    expect(renderGiftNotification({ ...gift, locale: "ht" }).text).toContain("Bonjou Marie!");
    expect(renderGiftNotification({ ...gift, locale: "fr" }).html).toContain("/fr/r/baby%20list");
    expect(renderOrderConfirmation({ ...order, locale: "en" }).subject).toBe("Your order is confirmed | Bayou");
    expect(renderOrderConfirmation({ ...order, locale: "fr" }).text).toContain("Total: 25.00 USD");
    expect(anonymousBuyer("fr")).toBe("Quelqu’un");
  });
  it("greets without a name when none is saved, and escapes user text", () => {
    expect(renderGiftNotification({ ...gift, recipientName: null, locale: "fr" }).text.startsWith("Bonjour !")).toBe(true);
    const { html } = renderGiftNotification({ ...gift, locale: "en" });
    expect(html).toContain("&lt;b&gt;Jean&lt;/b&gt;");
    expect(html).toContain("Crib &amp; mattress");
    expect(html).not.toContain("<b>Jean</b>");
  });
  it("uses no em dashes", () => {
    for (const locale of ["ht", "fr", "en"] as const) {
      const all = JSON.stringify([renderGiftNotification({ ...gift, locale }), renderOrderConfirmation({ ...order, locale })]);
      expect(all).not.toMatch(/—/);
    }
  });
});
