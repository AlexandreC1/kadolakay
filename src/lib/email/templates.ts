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

const layout = (locale: EmailLocale, inner: string) => `
<div lang="${locale}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="font-size:28px;margin:0;"><span style="color:#1d4ed8;">Kado</span><span style="color:#f59e0b;">Lakay</span></h1>
    <p style="color:#666;font-size:14px;margin:4px 0 0;">${COPY[locale].tagline}</p>
  </div>
  ${inner}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="color:#9ca3af;font-size:12px;text-align:center;">KadoLakay · ${COPY[locale].tagline}</p>
</div>`;

const list = (items: string[]) =>
  `<ul style="margin:0;padding-left:20px;color:#4b5563;">${items.map((i) => `<li style="margin-bottom:4px;">${e(i)}</li>`).join("")}</ul>`;
const button = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${e(safeUrl(href))}" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${e(label)}</a></div>`;
const money = (amount: string, currency: "HTG" | "USD") => (currency === "HTG" ? `G${amount}` : `$${amount}`);

type Renderer<T extends EmailTemplate> = (p: EmailPayloads[T], locale: EmailLocale) => RenderedEmail;

/** Translatable copy. Functions receive ALREADY-ESCAPED (html) or safe (text) values. */
const COPY = {
  ht: {
    tagline: "Kado pou tout okazyon, lakay ou.",
    hello: (n: string) => `Bonjou ${n}!`,
    items: "Atik yo:",
    orderNo: "Nimewo kòmand",
    thanks: "Mèsi pou itilize KadoLakay!",
    team: "Ekip KadoLakay",
    giftSubject: (b: string) => `${b} te voye yon kado pou ou! | KadoLakay`,
    giftHeading: "Ou resevwa yon kado!",
    giftBody: (b: string, r: string) => `${b} te achte kado pou ou nan rejis "${r}" ou a.`,
    message: "Mesaj",
    viewRegistry: "Wè rejis ou",
    receiptSubject: (o: string) => `Mèsi pou kado ou a! Kòmand #${o} | KadoLakay`,
    receiptHeading: "Kòmand ou konfime!",
    receiptBody: (r: string) => `Mèsi pou kado ou a nan rejis "${r}".`,
    total: "Total",
    natcashSubject: (o: string) => `Natcash: kòmand #${o} | KadoLakay`,
    natcashBody: (a: string, m: string, o: string) => `Voye G${a} sou Natcash ${m} ak referans ${o}.`,
    instructions: "Enstriksyon",
    shippedSubject: (o: string) => `Kòmand #${o} an wout! | KadoLakay`,
    shippedBody: (b: string, o: string) => `${b} voye kòmand ${o} ou a.`,
    rejectedSubject: (o: string) => `Peman kòmand #${o} pa pase | KadoLakay`,
    rejectedBody: (o: string, r: string) => `Nou pa t ka konfime peman kòmand ${o}: ${r}`,
    deletedSubject: "Kont KadoLakay ou efase",
    deletedBody: "Kont ou efase. Mèsi pou te itilize KadoLakay.",
    exportSubject: "Done KadoLakay ou yo pare",
    exportBody: (x: string) => `Lyen an ekspire ${x}.`,
    download: "Telechaje",
    contactSubject: (n: string) => `Kontak: ${n}`,
  },
  fr: {
    tagline: "Des cadeaux pour toutes les occasions, chez vous.",
    hello: (n: string) => `Bonjour ${n} !`,
    items: "Articles :",
    orderNo: "Numéro de commande",
    thanks: "Merci d'utiliser KadoLakay !",
    team: "L'équipe KadoLakay",
    giftSubject: (b: string) => `${b} vous a offert un cadeau ! | KadoLakay`,
    giftHeading: "Vous avez reçu un cadeau !",
    giftBody: (b: string, r: string) => `${b} vous a acheté un cadeau sur votre liste « ${r} ».`,
    message: "Message",
    viewRegistry: "Voir votre liste",
    receiptSubject: (o: string) => `Merci pour votre cadeau ! Commande n°${o} | KadoLakay`,
    receiptHeading: "Commande confirmée !",
    receiptBody: (r: string) => `Merci pour votre cadeau sur la liste « ${r} ».`,
    total: "Total",
    natcashSubject: (o: string) => `Natcash : commande n°${o} | KadoLakay`,
    natcashBody: (a: string, m: string, o: string) => `Envoyez G${a} via Natcash au ${m} avec la référence ${o}.`,
    instructions: "Instructions",
    shippedSubject: (o: string) => `Votre commande n°${o} est en route ! | KadoLakay`,
    shippedBody: (b: string, o: string) => `${b} a expédié votre commande ${o}.`,
    rejectedSubject: (o: string) => `Paiement de la commande n°${o} refusé | KadoLakay`,
    rejectedBody: (o: string, r: string) => `Nous n'avons pas pu confirmer le paiement de la commande ${o} : ${r}`,
    deletedSubject: "Votre compte KadoLakay a été supprimé",
    deletedBody: "Votre compte a été supprimé. Merci d'avoir utilisé KadoLakay.",
    exportSubject: "Vos données KadoLakay sont prêtes",
    exportBody: (x: string) => `Le lien expire le ${x}.`,
    download: "Télécharger",
    contactSubject: (n: string) => `Contact : ${n}`,
  },
  en: {
    tagline: "Gifts for every occasion, at home.",
    hello: (n: string) => `Hi ${n}!`,
    items: "Items:",
    orderNo: "Order number",
    thanks: "Thanks for using KadoLakay!",
    team: "The KadoLakay team",
    giftSubject: (b: string) => `${b} sent you a gift! | KadoLakay`,
    giftHeading: "You received a gift!",
    giftBody: (b: string, r: string) => `${b} bought you a gift from your "${r}" registry.`,
    message: "Message",
    viewRegistry: "View your registry",
    receiptSubject: (o: string) => `Thanks for your gift! Order #${o} | KadoLakay`,
    receiptHeading: "Order confirmed!",
    receiptBody: (r: string) => `Thank you for your gift from the "${r}" registry.`,
    total: "Total",
    natcashSubject: (o: string) => `Natcash: order #${o} | KadoLakay`,
    natcashBody: (a: string, m: string, o: string) => `Send G${a} via Natcash to ${m} with reference ${o}.`,
    instructions: "Instructions",
    shippedSubject: (o: string) => `Order #${o} is on its way! | KadoLakay`,
    shippedBody: (b: string, o: string) => `${b} shipped your order ${o}.`,
    rejectedSubject: (o: string) => `Payment for order #${o} failed | KadoLakay`,
    rejectedBody: (o: string, r: string) => `We couldn't confirm payment for order ${o}: ${r}`,
    deletedSubject: "Your KadoLakay account was deleted",
    deletedBody: "Your account has been deleted. Thanks for using KadoLakay.",
    exportSubject: "Your KadoLakay data is ready",
    exportBody: (x: string) => `The link expires ${x}.`,
    download: "Download",
    contactSubject: (n: string) => `Contact: ${n}`,
  },
} satisfies Record<EmailLocale, Record<string, unknown>>;

const strong = (v: string) => `<strong>${e(v)}</strong>`;
const para = (inner: string) => `<p style="color:#374151;">${inner}</p>`;

const renderers: { [K in EmailTemplate]: Renderer<K> } = {
  "gift-notification": (p, l) => {
    const c = COPY[l];
    const url = `${appUrl()}/r/${encodeURIComponent(p.registrySlug)}`;
    return {
      subject: c.giftSubject(p.buyerName),
      text: [
        c.hello(t(p.recipientName)), "", c.giftBody(t(p.buyerName), t(p.registryTitle)), "",
        c.items, ...p.itemNames.map((n) => `  • ${t(n)}`), "",
        p.giftMessage ? `${c.message}: "${t(p.giftMessage)}"` : "", "",
        `${c.orderNo}: ${t(p.orderNumber)}`, "", `${c.viewRegistry}: ${url}`, "", c.thanks, c.team,
      ].join("\n"),
      html: layout(l, `
  <div style="background:#fef3c7;border-radius:12px;padding:24px;margin-bottom:20px;">
    <h2 style="color:#92400e;margin:0 0 8px;">${c.giftHeading}</h2>
    <p style="color:#78350f;margin:0;">${c.giftBody(strong(p.buyerName), strong(p.registryTitle))}</p>
  </div>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;"><h3 style="margin:0 0 8px;color:#374151;">${c.items}</h3>${list(p.itemNames)}</div>
  ${p.giftMessage ? `<div style="border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:16px;background:#fffbeb;"><p style="margin:0;color:#92400e;font-style:italic;">"${e(p.giftMessage)}"</p><p style="margin:8px 0 0;color:#b45309;font-size:14px;">${e(p.buyerName)}</p></div>` : ""}
  <p style="color:#6b7280;font-size:14px;">${c.orderNo}: ${strong(p.orderNumber)}</p>
  ${button(url, c.viewRegistry)}`),
    };
  },
  "order-receipt": (p, l) => {
    const c = COPY[l];
    return {
      subject: c.receiptSubject(p.orderNumber),
      text: [
        c.hello(t(p.buyerName)), "", c.receiptBody(t(p.registryTitle)), "", `${c.orderNo}: ${t(p.orderNumber)}`, "",
        c.items, ...p.itemNames.map((n) => `  • ${t(n)}`), "", `${c.total}: ${money(t(p.totalAmount), p.currency)}`, "", c.thanks, c.team,
      ].join("\n"),
      html: layout(l, `
  <div style="background:#ecfdf5;border-radius:12px;padding:24px;margin-bottom:20px;">
    <h2 style="color:#065f46;margin:0 0 8px;">${c.receiptHeading}</h2>
    <p style="color:#047857;margin:0;">${c.receiptBody(strong(p.registryTitle))}</p>
  </div>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;"><h3 style="margin:0 0 8px;color:#374151;">${c.items}</h3>${list(p.itemNames)}</div>
  <p style="color:#374151;font-weight:600;">${c.total}: ${e(money(p.totalAmount, p.currency))}</p>
  <p style="color:#6b7280;font-size:14px;">${c.orderNo}: ${strong(p.orderNumber)}</p>`),
    };
  },
  "natcash-instructions": (p, l) => {
    const c = COPY[l];
    return {
      subject: c.natcashSubject(p.orderNumber),
      text: `${c.hello(t(p.buyerName))}\n\n${c.natcashBody(t(p.amountHTG), t(p.merchantNumber), t(p.orderNumber))}\n${safeUrl(p.instructionsUrl)}`,
      html: layout(l, `${para(c.hello(e(p.buyerName)))}${para(c.natcashBody(strong(p.amountHTG), strong(p.merchantNumber), strong(p.orderNumber)))}${button(p.instructionsUrl, c.instructions)}`),
    };
  },
  "order-shipped": (p, l) => {
    const c = COPY[l];
    return {
      subject: c.shippedSubject(p.orderNumber),
      text: `${c.hello(t(p.buyerName))}\n\n${c.shippedBody(t(p.businessName), t(p.orderNumber))}`,
      html: layout(l, `${para(c.hello(e(p.buyerName)))}${para(c.shippedBody(strong(p.businessName), strong(p.orderNumber)))}`),
    };
  },
  "payment-rejected": (p, l) => {
    const c = COPY[l];
    return {
      subject: c.rejectedSubject(p.orderNumber),
      text: `${c.hello(t(p.buyerName))}\n\n${c.rejectedBody(t(p.orderNumber), t(p.reason))}`,
      html: layout(l, `${para(c.hello(e(p.buyerName)))}${para(c.rejectedBody(strong(p.orderNumber), e(p.reason)))}`),
    };
  },
  "account-deleted": (p, l) => {
    const c = COPY[l];
    return {
      subject: c.deletedSubject,
      text: `${c.hello(t(p.name ?? ""))}\n\n${c.deletedBody}`,
      html: layout(l, `${para(c.hello(e(p.name ?? "")))}${para(c.deletedBody)}`),
    };
  },
  "data-export-ready": (p, l) => {
    const c = COPY[l];
    return {
      subject: c.exportSubject,
      text: `${c.hello(t(p.name ?? ""))}\n\n${c.exportBody(t(p.expiresAt))}\n${safeUrl(p.downloadUrl)}`,
      html: layout(l, `${para(c.hello(e(p.name ?? "")))}${para(c.exportBody(e(p.expiresAt)))}${button(p.downloadUrl, c.download)}`),
    };
  },
  "contact-form": (p, l) => ({
    subject: COPY[l].contactSubject(p.fromName),
    text: `${t(p.fromName)} <${t(p.fromEmail)}>\n\n${t(p.message)}`,
    html: `<p><strong>${e(p.fromName)}</strong> &lt;${e(p.fromEmail)}&gt;</p><pre style="white-space:pre-wrap">${e(p.message)}</pre>`,
  }),
};

export const EMAIL_LOCALES: EmailLocale[] = ["ht", "fr", "en"];

export function renderEmail<T extends EmailTemplate>(template: T, payload: EmailPayloads[T], locale: EmailLocale = "ht"): RenderedEmail {
  const l: EmailLocale = EMAIL_LOCALES.includes(locale) ? locale : "ht";
  const r = (renderers[template] as Renderer<T>)(payload, l);
  return { ...r, subject: safeSubject(r.subject) };
}
