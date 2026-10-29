import { db } from "@/lib/db";
import { stripe } from "@/lib/payments/stripe";
import { fulfillOrder } from "@/lib/orders";
import { releaseCheckout } from "./checkout";

/** Provider verification recovers missed webhooks and ambiguous network errors. */
export async function reconcileStripeCheckouts({ maxItems = 50, budgetMs = 30000 } = {}) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return { checked: 0, recovered: 0, failed: 0 };
  const deadline = Date.now() + Math.min(30000, Math.max(1000, budgetMs));
  const pending = await db.order.findMany({
    where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 35 * 60_000) }, payment: { provider: "STRIPE" } },
    include: { payment: { select: { stripePaymentId: true } } }, take: Math.min(50, Math.max(1, Math.floor(maxItems))), orderBy: { createdAt: "asc" },
  });
  let recovered = 0;
  let failed = 0;
  let checked = 0;
  const requestOptions = { timeout: 3000, maxNetworkRetries: 0 };
  for (const order of pending) {
    if (Date.now() >= deadline) break;
    checked++;
    try {
      let session;
      if (order.payment?.stripePaymentId) session = await stripe.checkout.sessions.retrieve(order.payment.stripePaymentId, {}, requestOptions);
      else {
        // An interrupted create request may have succeeded before its ID was saved.
        // Fully scan this order's window before deciding that no session exists.
        let scanned = 0;
        for await (const candidate of stripe.checkout.sessions.list({ created: { gte: Math.floor(order.createdAt.getTime() / 1000) - 60, lte: Math.floor(order.createdAt.getTime() / 1000) + 600 }, limit: 100 }, requestOptions)) {
          if (candidate.metadata?.orderId === order.id) { session = candidate; break; }
          if (++scanned >= 1000 || Date.now() >= deadline) throw new Error("RECONCILIATION_SCAN_LIMIT");
        }
        if (!session) { await releaseCheckout(order.id); recovered++; continue; }
        await db.payment.update({ where: { orderId: order.id }, data: { stripePaymentId: session.id } });
      }
      if (session.payment_status === "paid") {
        await fulfillOrder(order.id, { sessionId: session.id, eventId: `reconcile:${session.id}`, amountMinor: session.amount_total ?? -1, currency: session.currency ?? "" }); recovered++;
      } else if (session.status === "expired") { await releaseCheckout(order.id); recovered++; }
      else if (session.status === "open") {
        // Close the provider session before releasing its stock reservation.
        await stripe.checkout.sessions.expire(session.id, {}, requestOptions);
        await releaseCheckout(order.id); recovered++;
      }
    } catch { failed++; console.error("Stripe reconciliation failed", { code: "RECONCILIATION_FAILED" }); }
  }
  return { checked, recovered, failed };
}
