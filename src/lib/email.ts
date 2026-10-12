/**
 * Transactional email — KadoLakay.
 *
 * Rendering lives in ./email/templates (all values escaped, review H2);
 * durable delivery lives in ./email/outbox (enqueueEmail + send-emails cron).
 * The direct-send helpers below keep their old signatures so existing
 * callers (orders.ts) keep working until WS1 switches them to enqueueEmail.
 */
import { Resend } from "resend";
import type { EmailLocale, EmailPayloads, EmailTemplate } from "@/lib/contracts/email";
import { log } from "@/lib/log";
import { renderEmail } from "./email/templates";

let _resend: Resend | null = null;
function resendClient(): Resend {
  if (!_resend) _resend = new Resend(process.env.AUTH_RESEND_KEY ?? "re_build_placeholder");
  return _resend;
}

const FROM = () => process.env.AUTH_RESEND_FROM || "KadoLakay <noreply@kadolakay.com>";

/** Render + send one email. Throws on provider error (outbox retries). */
export async function deliverEmail<T extends EmailTemplate>(
  template: T,
  to: string,
  payload: EmailPayloads[T],
  locale: EmailLocale = "ht",
  idempotencyKey?: string,
): Promise<void> {
  const { subject, html, text } = renderEmail(template, payload, locale);
  const { error } = await resendClient().emails.send(
    { from: FROM(), to, subject, html, text },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  if (error) throw new Error(`resend: ${error.name}: ${error.message}`);
}

export async function sendGiftNotification(input: {
  recipientEmail: string;
  recipientName: string;
  buyerName: string;
  giftMessage?: string | null;
  itemNames: string[];
  registryTitle: string;
  registrySlug: string;
  orderNumber: string;
}) {
  const { recipientEmail, ...rest } = input;
  try {
    await deliverEmail("gift-notification", recipientEmail, { ...rest, giftMessage: rest.giftMessage ?? null });
  } catch (err) {
    log.error("email.gift_notification_failed", { err, orderNumber: input.orderNumber });
  }
}

export async function sendOrderConfirmation(input: {
  buyerEmail: string;
  buyerName: string;
  itemNames: string[];
  registryTitle: string;
  orderNumber: string;
  totalAmount: number | string;
  currency: "HTG" | "USD";
}) {
  const { buyerEmail, totalAmount, ...rest } = input;
  const total = typeof totalAmount === "number" ? totalAmount.toFixed(2) : totalAmount;
  try {
    await deliverEmail("order-receipt", buyerEmail, { ...rest, totalAmount: total });
  } catch (err) {
    log.error("email.order_receipt_failed", { err, orderNumber: input.orderNumber });
  }
}
