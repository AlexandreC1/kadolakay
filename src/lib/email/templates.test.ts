import { describe, expect, it } from "vitest";
import { renderEmail } from "./templates";
import { escapeHtml, safeSubject, safeUrl } from "./escape";

const XSS = `<img src=x onerror="alert(1)">`;

describe("email escaping", () => {
  it("escapes html metacharacters", () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  });
  it("strips CR/LF from subjects", () => {
    expect(safeSubject("hi\r\nBcc: evil@x.com")).toBe("hi Bcc: evil@x.com");
  });
  it("rejects non-http urls", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("https://kadolakay.com/r/a")).toBe("https://kadolakay.com/r/a");
  });
});

describe("renderEmail", () => {
  it("gift-notification escapes every attacker-controlled field", () => {
    const r = renderEmail("gift-notification", {
      recipientName: XSS, buyerName: `${XSS}\r\nBcc: a@b.c`, giftMessage: XSS,
      itemNames: [XSS], registryTitle: XSS, registrySlug: `a"><script>`, orderNumber: XSS,
    });
    expect(r.html).not.toContain("<img");
    expect(r.html).not.toContain("<script");
    expect(r.html).toContain("&lt;img");
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(r.html).toContain("/r/a%22%3E%3Cscript%3E");
  });
  it("order-receipt formats currency and escapes", () => {
    const r = renderEmail("order-receipt", {
      buyerName: XSS, itemNames: ["Blender"], registryTitle: "Maryaj", orderNumber: "KL-1", totalAmount: "1250.00", currency: "HTG",
    });
    expect(r.html).toContain("G1250.00");
    expect(r.text).toContain("G1250.00");
    expect(r.html).not.toContain("<img");
  });
  it("every template renders without raw input", () => {
    const all = [
      renderEmail("natcash-instructions", { buyerName: XSS, orderNumber: "1", amountHTG: "10", merchantNumber: XSS, instructionsUrl: "javascript:x" }),
      renderEmail("order-shipped", { buyerName: XSS, orderNumber: "1", businessName: XSS }),
      renderEmail("payment-rejected", { buyerName: XSS, orderNumber: "1", reason: XSS }),
      renderEmail("account-deleted", { name: XSS }),
      renderEmail("data-export-ready", { name: null, downloadUrl: "https://x.y/z", expiresAt: XSS }),
      renderEmail("contact-form", { fromName: XSS, fromEmail: XSS, message: XSS }),
    ];
    for (const r of all) expect(r.html).not.toContain("<img");
    expect(all[0].html).not.toContain("javascript:");
  });
});

describe("locales", () => {
  const gift = {
    recipientName: "Ana", buyerName: "Jan", giftMessage: null, itemNames: ["Blender"],
    registryTitle: "Maryaj", registrySlug: "maryaj", orderNumber: "KL-1",
  };
  it("renders ht / fr / en copy", () => {
    expect(renderEmail("gift-notification", gift, "ht").subject).toContain("te voye yon kado");
    expect(renderEmail("gift-notification", gift, "fr").subject).toContain("vous a offert un cadeau");
    expect(renderEmail("gift-notification", gift, "en").subject).toContain("sent you a gift");
    expect(renderEmail("gift-notification", gift, "fr").html).toContain('lang="fr"');
    expect(renderEmail("order-shipped", { buyerName: "A", orderNumber: "1", businessName: "B" }, "en").text).toContain("shipped your order");
  });
  it("unknown locale falls back to ht", () => {
    expect(renderEmail("gift-notification", gift, "de" as never).subject).toContain("te voye yon kado");
  });
  it("escapes in every locale", () => {
    for (const l of ["ht", "fr", "en"] as const) {
      const r = renderEmail("gift-notification", { ...gift, buyerName: XSS, registryTitle: XSS }, l);
      expect(r.html).not.toContain("<img");
      const s = renderEmail("payment-rejected", { buyerName: XSS, orderNumber: XSS, reason: XSS }, l);
      expect(s.html).not.toContain("<img");
    }
  });
});
