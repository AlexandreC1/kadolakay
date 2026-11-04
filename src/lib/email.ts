import { Resend } from "resend";
import { brandEmailSender } from "./brand";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export type EmailLocale = "ht" | "fr" | "en";
/** Unknown or missing locales fall back to Kreyòl, the product default. */
export function emailLocale(value: string | null | undefined): EmailLocale {
  return value === "fr" || value === "en" ? value : "ht";
}

const copy = {
  ht: {
    someone: "Yon moun",
    hello: (name: string) => (name ? `Bonjou ${name}!` : "Bonjou!"),
    giftSubject: "Ou resevwa yon kado! | Bayou",
    giftLine: (buyer: string, list: string) => `${buyer} te achte yon kado pou rejis ${list}.`,
    order: "Kòmand",
    viewList: "Wè rejis ou",
    confirmSubject: "Kòmand ou konfime | Bayou",
    thanks: (list: string) => `Mèsi pou kado ou a nan rejis ${list}.`,
    list: "Rejis",
    total: "Total",
  },
  fr: {
    someone: "Quelqu’un",
    hello: (name: string) => (name ? `Bonjour ${name} !` : "Bonjour !"),
    giftSubject: "Vous avez reçu un cadeau ! | Bayou",
    giftLine: (buyer: string, list: string) => `${buyer} vous a offert un cadeau de la liste ${list}.`,
    order: "Commande",
    viewList: "Voir votre liste",
    confirmSubject: "Votre commande est confirmée | Bayou",
    thanks: (list: string) => `Merci pour votre cadeau de la liste ${list}.`,
    list: "Liste",
    total: "Total",
  },
  en: {
    someone: "Someone",
    hello: (name: string) => (name ? `Hello ${name}!` : "Hello!"),
    giftSubject: "You received a gift! | Bayou",
    giftLine: (buyer: string, list: string) => `${buyer} bought you a gift from your ${list} list.`,
    order: "Order",
    viewList: "View your list",
    confirmSubject: "Your order is confirmed | Bayou",
    thanks: (list: string) => `Thank you for your gift from the ${list} list.`,
    list: "List",
    total: "Total",
  },
} as const;

/** The word shown instead of a buyer's name when they chose to stay anonymous. */
export const anonymousBuyer = (locale: EmailLocale) => copy[locale].someone;

async function deliver(to: string, subject: string, text: string, html: string) {
  if (!process.env.AUTH_RESEND_KEY) return;
  try {
    const result = await new Resend(process.env.AUTH_RESEND_KEY).emails.send({
      from: brandEmailSender(process.env.AUTH_RESEND_FROM) || "Bayou <noreply@kadolakay.com>", to, subject, text, html,
    });
    if (result.error) console.error("Transactional email was not delivered", { code: result.error.name });
  } catch {
    console.error("Transactional email delivery failed");
  }
}

function appOrigin() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
}

export function renderGiftNotification(data: {
  locale: EmailLocale; recipientName: string | null; buyerName: string; giftMessage?: string | null;
  itemNames: string[]; registryTitle: string; registrySlug: string; orderNumber: string;
}) {
  const c = copy[data.locale];
  const name = data.recipientName?.trim() || "";
  const url = `${appOrigin()}/${data.locale}/r/${encodeURIComponent(data.registrySlug)}`;
  const text = [c.hello(name), c.giftLine(data.buyerName, data.registryTitle), ...data.itemNames, data.giftMessage || "", `${c.order}: ${data.orderNumber}`, url].join("\n");
  const html = `<h1>Bayou</h1><p>${escapeHtml(c.hello(name))}</p><p>${escapeHtml(c.giftLine(data.buyerName, data.registryTitle))}</p><ul>${data.itemNames.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${data.giftMessage ? `<p>${escapeHtml(data.giftMessage)}</p>` : ""}<p>${escapeHtml(c.order)}: ${escapeHtml(data.orderNumber)}</p><a href="${escapeHtml(url)}">${escapeHtml(c.viewList)}</a>`;
  return { subject: c.giftSubject, text, html };
}

export function renderOrderConfirmation(data: {
  locale: EmailLocale; buyerName: string; itemNames: string[]; registryTitle: string;
  orderNumber: string; totalAmount: number; currency: "HTG" | "USD";
}) {
  const c = copy[data.locale];
  const amount = `${data.totalAmount.toFixed(2)} ${data.currency}`;
  const text = [c.hello(data.buyerName), c.thanks(data.registryTitle), `${c.list}: ${data.registryTitle}`, ...data.itemNames, `${c.total}: ${amount}`, `${c.order}: ${data.orderNumber}`].join("\n");
  const html = `<h1>Bayou</h1><p>${escapeHtml(c.hello(data.buyerName))}</p><p>${escapeHtml(c.thanks(data.registryTitle))}</p><ul>${data.itemNames.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p>${escapeHtml(c.total)}: ${escapeHtml(amount)}</p><p>${escapeHtml(c.order)}: ${escapeHtml(data.orderNumber)}</p>`;
  return { subject: c.confirmSubject, text, html };
}

export async function sendGiftNotification(data: Parameters<typeof renderGiftNotification>[0] & { recipientEmail: string }) {
  const { subject, text, html } = renderGiftNotification(data);
  await deliver(data.recipientEmail, subject, text, html);
}

export async function sendOrderConfirmation(data: Parameters<typeof renderOrderConfirmation>[0] & { buyerEmail: string }) {
  const { subject, text, html } = renderOrderConfirmation(data);
  await deliver(data.buyerEmail, subject, text, html);
}
