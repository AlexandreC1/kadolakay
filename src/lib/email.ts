/**
 * =============================================================================
 * Transactional Email Service — KadoLakay
 * =============================================================================
 *
 * WHY SEPARATE FROM AUTH.JS RESEND?
 * Auth.js uses Resend for magic link login emails. That's authentication.
 * This module handles transactional emails — notifications triggered by
 * user actions like purchasing a gift or completing an order.
 *
 * We use the same Resend API key (AUTH_RESEND_KEY) but call the SDK directly
 * instead of going through Auth.js, because Auth.js's Resend provider only
 * sends verification emails.
 *
 * PATTERN:
 *   Event happens (e.g., order paid)
 *     → fulfillOrder() calls sendGiftNotification()
 *       → Resend API delivers the email
 *
 * WHY NOT A SEPARATE EMAIL QUEUE?
 * For MVP, sending inline is fine. If emails start slowing down webhooks,
 * we'd move to a queue (e.g., Inngest, BullMQ). But Resend's API is fast
 * enough (~200ms) that inline sending works for our scale.
 * =============================================================================
 */

import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

const FROM =
  process.env.AUTH_RESEND_FROM || "KadoLakay <noreply@kadolakay.com>";

/**
 * Notify the registry owner that someone purchased a gift from their registry.
 *
 * This is one of the most important emails in the app — it's the moment
 * the registry owner finds out someone cares enough to buy them something.
 * The email should feel warm and personal, matching KadoLakay's brand.
 */
export async function sendGiftNotification({
  recipientEmail,
  recipientName,
  buyerName,
  giftMessage,
  itemNames,
  registryTitle,
  registrySlug,
  orderNumber,
}: {
  recipientEmail: string;
  recipientName: string;
  buyerName: string;
  giftMessage?: string | null;
  itemNames: string[];
  registryTitle: string;
  registrySlug: string;
  orderNumber: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const registryUrl = `${appUrl}/r/${registrySlug}`;
  const itemList = itemNames.map((name) => `  • ${name}`).join("\n");

  try {
    await resend.emails.send({
      from: FROM,
      to: recipientEmail,
      subject: `🎁 ${buyerName} te voye yon kado pou ou! — KadoLakay`,
      // Plain text version (for email clients that don't render HTML)
      text: `Bonjou ${recipientName}!

${buyerName} te achte kado pou ou nan rejis "${registryTitle}" ou a!

Atik yo:
${itemList}

${giftMessage ? `Mesaj: "${giftMessage}"` : ""}

Nimewo kòmand: ${orderNumber}

Wè rejis ou: ${registryUrl}

Mèsi pou itilize KadoLakay!
— Ekip KadoLakay`,

      // HTML version (most email clients will render this)
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #b8860b; font-size: 28px; margin: 0;">KadoLakay</h1>
            <p style="color: #666; font-size: 14px; margin: 4px 0 0;">Kado pou tout okazyon, lakay ou.</p>
          </div>

          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0 0 8px;">🎁 Ou resevwa yon kado!</h2>
            <p style="color: #78350f; margin: 0;">
              <strong>${buyerName}</strong> te achte kado pou ou nan rejis
              "<strong>${registryTitle}</strong>" ou a.
            </p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px; color: #374151;">Atik yo:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              ${itemNames.map((name) => `<li style="margin-bottom: 4px;">${name}</li>`).join("")}
            </ul>
          </div>

          ${
            giftMessage
              ? `
          <div style="border-left: 4px solid #b8860b; padding: 12px 16px; margin-bottom: 16px; background: #fffbeb;">
            <p style="margin: 0; color: #92400e; font-style: italic;">"${giftMessage}"</p>
            <p style="margin: 8px 0 0; color: #b45309; font-size: 14px;">— ${buyerName}</p>
          </div>
          `
              : ""
          }

          <p style="color: #6b7280; font-size: 14px;">
            Nimewo kòmand: <strong>${orderNumber}</strong>
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${registryUrl}" style="display: inline-block; background: #b8860b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Wè rejis ou
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            KadoLakay — Kado pou tout okazyon, lakay ou.
          </p>
        </div>
      `,
    });
  } catch (error) {
    // Log but don't throw — email failure shouldn't break order fulfillment.
    // The order is already paid; the notification is a nice-to-have.
    console.error("Failed to send gift notification email:", error);
  }
}

/**
 * Send a confirmation email to the gift buyer.
 */
export async function sendOrderConfirmation({
  buyerEmail,
  buyerName,
  itemNames,
  registryTitle,
  orderNumber,
  totalAmount,
  currency,
}: {
  buyerEmail: string;
  buyerName: string;
  itemNames: string[];
  registryTitle: string;
  orderNumber: string;
  totalAmount: number;
  currency: "HTG" | "USD";
}) {
  const currencySymbol = currency === "HTG" ? "G" : "$";
  const itemList = itemNames.map((name) => `  • ${name}`).join("\n");

  try {
    await resend.emails.send({
      from: FROM,
      to: buyerEmail,
      subject: `Mèsi pou kado ou a! Kòmand #${orderNumber} — KadoLakay`,
      text: `Bonjou ${buyerName}!

Mèsi pou kado ou a! Men detay kòmand ou:

Rejis: ${registryTitle}
Nimewo kòmand: ${orderNumber}

Atik yo:
${itemList}

Total: ${currencySymbol}${totalAmount.toFixed(2)}

Mèsi pou itilize KadoLakay!
— Ekip KadoLakay`,

      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #b8860b; font-size: 28px; margin: 0;">KadoLakay</h1>
            <p style="color: #666; font-size: 14px; margin: 4px 0 0;">Kado pou tout okazyon, lakay ou.</p>
          </div>

          <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <h2 style="color: #065f46; margin: 0 0 8px;">✅ Kòmand ou konfime!</h2>
            <p style="color: #047857; margin: 0;">
              Mèsi pou kado ou a nan rejis "<strong>${registryTitle}</strong>".
            </p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px; color: #374151;">Atik yo:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              ${itemNames.map((name) => `<li style="margin-bottom: 4px;">${name}</li>`).join("")}
            </ul>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid #e5e7eb;">
            <span style="color: #374151; font-weight: 600;">Total:</span>
            <span style="color: #374151; font-weight: 600;">${currencySymbol}${totalAmount.toFixed(2)}</span>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Nimewo kòmand: <strong>${orderNumber}</strong>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            KadoLakay — Kado pou tout okazyon, lakay ou.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
}
