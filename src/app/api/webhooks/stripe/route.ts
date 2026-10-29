import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/payments/stripe";
import { fulfillOrder } from "@/lib/orders";
import { releaseCheckout } from "@/services/checkout";
import type Stripe from "stripe";
import { readWebhookBody } from "@/lib/webhook-body";
import { recordOperationalEvent } from "@/lib/operational-events";

export async function POST(req: NextRequest) {
  const started = Date.now();
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await readWebhookBody(req), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" && session.metadata?.orderId) {
        await fulfillOrder(session.metadata.orderId, {
          sessionId: session.id, eventId: event.id,
          amountMinor: session.amount_total ?? -1, currency: session.currency ?? "",
        });
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.orderId) await releaseCheckout(session.metadata.orderId);
    }
    recordOperationalEvent("webhook_processing", { outcome: "ok", durationMs: Date.now() - started });
    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx makes Stripe retry. Never acknowledge uncommitted fulfillment.
    recordOperationalEvent("webhook_processing", { outcome: "failed", durationMs: Date.now() - started });
    return NextResponse.json({ error: "Processing failed. Delivery will be retried." }, { status: 500 });
  }
}
