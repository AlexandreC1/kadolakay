/**
 * Stripe webhook (server-to-server, signed).
 * - checkout.session.completed: fulfill only when payment_status === "paid"
 * - checkout.session.async_payment_succeeded: delayed methods settle here
 * - checkout.session.async_payment_failed / expired: mark the order failed/expired
 * Amount and currency are compared with Payment.amountExpected in claimAndFulfill (review M4).
 * Unknown orders return 200 (logged) so Stripe doesn't retry forever.
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, verifiedFromStripeSession } from "@/lib/payments/stripe";
import { db } from "@/lib/db";
import { claimAndFulfill } from "@/lib/orders";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const verified = verifiedFromStripeSession(event.data.object as Stripe.Checkout.Session, event.id);
        if (verified.status !== "COMPLETED") break; // wait for async_payment_succeeded
        const outcome = await claimAndFulfill(verified);
        if (outcome === "rejected") log.error("stripe webhook: rejected", { orderId: verified.orderId, eventId: event.id });
        return NextResponse.json({ received: true, outcome });
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          const status = event.type === "checkout.session.expired" ? "EXPIRED" : "PAYMENT_FAILED";
          await db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status } });
          await db.payment.updateMany({ where: { orderId, status: { in: ["PENDING", "PROCESSING"] } }, data: { status: "FAILED" } });
        }
        break;
      }
    }
  } catch (err) {
    log.error("stripe webhook: processing error", { eventId: event.id, type: event.type, err });
    // Unexpected DB/infra error → 500 so Stripe retries; the claim is idempotent.
    return NextResponse.json({ error: "processing error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
