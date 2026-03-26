import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/payments/stripe";
import { db } from "@/lib/db";
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
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      // Update payment status
      await db.payment.updateMany({
        where: { orderId, provider: "STRIPE" },
        data: {
          status: "COMPLETED",
          stripePaymentId: session.payment_intent as string,
          paidAt: new Date(),
        },
      });

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      // Update registry item fulfillment
      const orderItems = await db.orderItem.findMany({
        where: { orderId },
        include: { registryItem: true },
      });

      for (const oi of orderItems) {
        const newFulfilled = oi.registryItem.fulfilledQty + oi.quantity;
        await db.registryItem.update({
          where: { id: oi.registryItemId },
          data: {
            fulfilledQty: newFulfilled,
            status:
              newFulfilled >= oi.registryItem.quantity
                ? "FULFILLED"
                : "PARTIALLY_FULFILLED",
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
