/**
 * Transactional email templates. Every interpolated value goes through
 * escapeHtml (HTML) / safeText (text) / safeSubject (subject): buyer names,
 * gift messages and registry/item titles are attacker-controlled (review H2).
 */
import type { EmailLocale, EmailPayloads, EmailTemplate } from "@/lib/contracts/email";
import { escapeHtml as e, safeSubject, safeText as t, safeUrl } from "./escape";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const layout = (inner: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#b8860b;font-size:28px;margin:0;">KadoLakay</h1>
    <p style="color:#666;font-size:14px;margin:4px 0 0;">Kado pou tout okazyon, lakay ou.</p>
  </div>
  ${inner}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="color:#9ca3af;font-size:12px;text-align:center;">KadoLakay — Kado pou tout okazyon, lakay ou.</p>
</div>`;

const list = (items: string[]) =>
  `<ul style="margin:0;padding-left:20px;color:#4b5563;">${items.map((i) => `<li style="margin-bottom:4px;">${e(i)}</li>`).join("")}</ul>`;
const button = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${e(safeUrl(href))}" style="display:inline-block;background:#b8860b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${e(label)}</a></div>`;
const money = (amount: string, currency: "HTG" | "USD") => (currency === "HTG" ? `G${amount}` : `$${amount}`);

type Renderer<T extends EmailTemplate> = (p: EmailPayloads[T], locale: EmailLocale) => RenderedEmail;

const renderers: { [K in EmailTemplate]: Renderer<K> } = {
  "gift-notification": (p) => {
    const url = `${appUrl()}/r/${encodeURIComponent(p.registrySlug)}`;
    return {
      subject: `🎁 ${p.buyerName} te voye yon kado pou ou! — KadoLakay`,
      text: [
        `Bonjou ${t(p.recipientName)}!`, "",
        `${t(p.buyerName)} te achte kado pou ou nan rejis "${t(p.registryTitle)}" ou a!`, "",
        "Atik yo:", ...p.itemNames.map((n) => `  • ${t(n)}`), "",
        p.giftMessage ? `Mesaj: "${t(p.giftMessage)}"` : "", "",
        `Nimewo kòmand: ${t(p.orderNumber)}`, "", `Wè rejis ou: ${url}`, "", "Mèsi pou itilize KadoLakay!", "— Ekip KadoLakay",
      ].join("\n"),
      html: layout(`
  <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:24px;margin-bottom:20px;">
    <h2 style="color:#92400e;margin:0 0 8px;">🎁 Ou resevwa yon kado!</h2>
    <p style="color:#78350f;margin:0;"><strong>${e(p.buyerName)}</strong> te achte kado pou ou nan rejis "<strong>${e(p.registryTitle)}</strong>" ou a.</p>
  </div>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;"><h3 style="margin:0 0 8px;color:#374151;">Atik yo:</h3>${list(p.itemNames)}</div>
  ${p.giftMessage ? `<div style="border-left:4px solid #b8860b;padding:12px 16px;margin-bottom:16px;background:#fffbeb;"><p style="margin:0;color:#92400e;font-style:italic;">"${e(p.giftMessage)}"</p><p style="margin:8px 0 0;color:#b45309;font-size:14px;">— ${e(p.buyerName)}</p></div>` : ""}
  <p style="color:#6b7280;font-size:14px;">Nimewo kòmand: <strong>${e(p.orderNumber)}</strong></p>
  ${button(url, "Wè rejis ou")}`),
    };
  },
  "order-receipt": (p) => ({
    subject: `Mèsi pou kado ou a! Kòmand #${p.orderNumber} — KadoLakay`,
    text: [
      `Bonjou ${t(p.buyerName)}!`, "", "Mèsi pou kado ou a! Men detay kòmand ou:", "",
      `Rejis: ${t(p.registryTitle)}`, `Nimewo kòmand: ${t(p.orderNumber)}`, "", "Atik yo:", ...p.itemNames.map((n) => `  • ${t(n)}`), "",
      `Total: ${money(t(p.totalAmount), p.currency)}`, "", "Mèsi pou itilize KadoLakay!", "— Ekip KadoLakay",
    ].join("\n"),
    html: layout(`
  <div style="background:#ecfdf5;border-radius:12px;padding:24px;margin-bottom:20px;">
    <h2 style="color:#065f46;margin:0 0 8px;">✅ Kòmand ou konfime!</h2>
    <p style="color:#047857;margin:0;">Mèsi pou kado ou a nan rejis "<strong>${e(p.registryTitle)}</strong>".</p>
  </div>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;"><h3 style="margin:0 0 8px;color:#374151;">Atik yo:</h3>${list(p.itemNames)}</div>
  <p style="color:#374151;font-weight:600;">Total: ${e(money(p.totalAmount, p.currency))}</p>
  <p style="color:#6b7280;font-size:14px;">Nimewo kòmand: <strong>${e(p.orderNumber)}</strong></p>`),
  }),
  "natcash-instructions": (p) => ({
    subject: `Natcash: kòmand #${p.orderNumber} — KadoLakay`,
    text: `Bonjou ${t(p.buyerName)}!\n\nVoye G${t(p.amountHTG)} sou Natcash ${t(p.merchantNumber)} ak referans ${t(p.orderNumber)}.\n${p.instructionsUrl}`,
    html: layout(`<p>Bonjou ${e(p.buyerName)}!</p><p>Voye <strong>G${e(p.amountHTG)}</strong> sou Natcash <strong>${e(p.merchantNumber)}</strong> ak referans <strong>${e(p.orderNumber)}</strong>.</p>${button(p.instructionsUrl, "Enstriksyon")}`),
  }),
  "order-shipped": (p) => ({
    subject: `Kòmand #${p.orderNumber} an wout! — KadoLakay`,
    text: `Bonjou ${t(p.buyerName)}!\n\n${t(p.businessName)} voye kòmand ${t(p.orderNumber)} ou a.`,
    html: layout(`<p>Bonjou ${e(p.buyerName)}!</p><p><strong>${e(p.businessName)}</strong> voye kòmand <strong>${e(p.orderNumber)}</strong> ou a.</p>`),
  }),
  "payment-rejected": (p) => ({
    subject: `Peman kòmand #${p.orderNumber} pa pase — KadoLakay`,
    text: `Bonjou ${t(p.buyerName)}!\n\nNou pa t ka konfime peman kòmand ${t(p.orderNumber)}: ${t(p.reason)}`,
    html: layout(`<p>Bonjou ${e(p.buyerName)}!</p><p>Nou pa t ka konfime peman kòmand <strong>${e(p.orderNumber)}</strong>: ${e(p.reason)}</p>`),
  }),
  "account-deleted": (p) => ({
    subject: "Kont KadoLakay ou efase",
    text: `Bonjou ${t(p.name ?? "")}!\n\nKont ou efase. Mèsi pou te itilize KadoLakay.`,
    html: layout(`<p>Bonjou ${e(p.name ?? "")}!</p><p>Kont ou efase. Mèsi pou te itilize KadoLakay.</p>`),
  }),
  "data-export-ready": (p) => ({
    subject: "Done KadoLakay ou yo pare",
    text: `Bonjou ${t(p.name ?? "")}!\n\nTelechaje done ou yo (lyen an ekspire ${t(p.expiresAt)}): ${p.downloadUrl}`,
    html: layout(`<p>Bonjou ${e(p.name ?? "")}!</p><p>Lyen an ekspire ${e(p.expiresAt)}.</p>${button(p.downloadUrl, "Telechaje")}`),
  }),
  "contact-form": (p) => ({
    subject: `Kontak: ${p.fromName}`,
    text: `${t(p.fromName)} <${t(p.fromEmail)}>\n\n${t(p.message)}`,
    html: `<p><strong>${e(p.fromName)}</strong> &lt;${e(p.fromEmail)}&gt;</p><pre style="white-space:pre-wrap">${e(p.message)}</pre>`,
  }),
};

export function renderEmail<T extends EmailTemplate>(template: T, payload: EmailPayloads[T], locale: EmailLocale = "ht"): RenderedEmail {
  const r = (renderers[template] as Renderer<T>)(payload, locale);
  return { ...r, subject: safeSubject(r.subject) };
}
