import { Resend } from "resend";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function deliver(to: string, subject: string, text: string, html: string) {
  if (!process.env.AUTH_RESEND_KEY) return;
  try {
    const result = await new Resend(process.env.AUTH_RESEND_KEY).emails.send({
      from: process.env.AUTH_RESEND_FROM || "KadoLakay <noreply@kadolakay.com>", to, subject, text, html,
    });
    if (result.error) console.error("Transactional email was not delivered", { code: result.error.name });
  } catch {
    console.error("Transactional email delivery failed");
  }
}

export async function sendGiftNotification(data: {
  recipientEmail: string; recipientName: string; buyerName: string; giftMessage?: string | null;
  itemNames: string[]; registryTitle: string; registrySlug: string; orderNumber: string;
}) {
  const url = `${new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin}/ht/r/${encodeURIComponent(data.registrySlug)}`;
  const text = `Bonjou ${data.recipientName}!\n${data.buyerName} te achte yon kado pou rejis ${data.registryTitle}.\n${data.itemNames.join("\n")}\n${data.giftMessage || ""}\nKòmand: ${data.orderNumber}\n${url}`;
  await deliver(data.recipientEmail, "Ou resevwa yon kado! | KadoLakay", text,
    `<h1>KadoLakay</h1><p>Bonjou ${escapeHtml(data.recipientName)}!</p><p>${escapeHtml(data.buyerName)} te achte yon kado pou ${escapeHtml(data.registryTitle)}.</p><ul>${data.itemNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>${data.giftMessage ? `<p>${escapeHtml(data.giftMessage)}</p>` : ""}<p>Kòmand: ${escapeHtml(data.orderNumber)}</p><a href="${escapeHtml(url)}">Wè rejis ou</a>`);
}

export async function sendOrderConfirmation(data: {
  buyerEmail: string; buyerName: string; itemNames: string[]; registryTitle: string;
  orderNumber: string; totalAmount: number; currency: "HTG" | "USD";
}) {
  const amount = `${data.totalAmount.toFixed(2)} ${data.currency}`;
  const text = `Bonjou ${data.buyerName}!\nMèsi pou kado ou a.\nRejis: ${data.registryTitle}\n${data.itemNames.join("\n")}\nTotal: ${amount}\nKòmand: ${data.orderNumber}`;
  await deliver(data.buyerEmail, "Kòmand ou konfime | KadoLakay", text,
    `<h1>KadoLakay</h1><p>Bonjou ${escapeHtml(data.buyerName)}!</p><p>Mèsi pou kado ou a nan rejis ${escapeHtml(data.registryTitle)}.</p><ul>${data.itemNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul><p>Total: ${escapeHtml(amount)}</p><p>Kòmand: ${escapeHtml(data.orderNumber)}</p>`);
}
