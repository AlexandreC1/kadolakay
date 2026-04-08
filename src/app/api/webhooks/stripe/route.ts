/**
 * =============================================================================
 * Stripe Webhook Handler
 * =============================================================================
 *
 * HOW STRIPE WEBHOOKS WORK:
 * Unlike MonCash/PayPal (which redirect the user's browser), Stripe sends
 * a server-to-server POST request to this endpoint when a payment event occurs.
 *
 * SECURITY:
 * 1. Stripe signs every webhook with STRIPE_WEBHOOK_SECRET
 * 2. We verify the signature before processing — if it doesn't match,
 *    someone is trying to send a fake webhook
 * 3. `fulfillOrder()` has idempotency guards — duplicate webhooks are safe
 *
 * IMPORTANT:
 * - This is a POST endpoint (server-to-server), not a GET (browser redirect)
 * - We read the raw body with `req.text()` because signature verification
 *   needs the exact bytes Stripe sent (not a parsed JSON object)
 * - We return 200 even for events we don't handle — returning 4xx would
 *   make Stripe retry the webhook indefinitely
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/payments/stripe";
import { db } from "@/lib/db";
import { fulfillOrder } from "@/lib/orders";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // We only care about successful checkout sessions.
  // Stripe sends many event types (payment_intent.created, charge.updated, etc.)
  // but checkout.session.completed is the one that means "money received".
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      // Idempotency guard: claim this Stripe event.id atomically. If it's
      // already recorded, this is a duplicate delivery and we short-circuit
      // without re-fulfilling. The unique index on providerEventId enforces
      // it at the DB level so we can't race a concurrent retry.
      try {
        await db.payment.update({
          where: { orderId },
          data: {
            status: "COMPLETED",
            stripePaymentId: session.payment_intent as string,
            providerEventId: event.id,
            paidAt: new Date(),
          },
        });
      } catch (err) {
        // P2002 = unique constraint violation on providerEventId → already processed.
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: string }).code === "P2002"
        ) {
          return NextResponse.json({ received: true, duplicate: true });
        }
        throw err;
      }

      // Fulfill the order (idempotent — safe if webhook fires twice)
      await fulfillOrder(orderId);
    }
  }

  // Always return 200 — even for events we don't handle.
  // Returning an error would cause Stripe to retry the webhook.
  return NextResponse.json({ received: true });
}
