/**
 * =============================================================================
 * PayPal Return URL Handler
 * =============================================================================
 *
 * HOW PAYPAL WORKS:
 * 1. User clicks "Pay with PayPal" → we create a PayPal order via API
 * 2. PayPal returns an approval URL → user goes to PayPal to approve
 * 3. After approval, PayPal redirects user back HERE with a `token` (order ID)
 * 4. We capture the payment (PayPal requires an explicit "capture" step)
 * 5. If captured → fulfill the order → redirect to success page
 *
 * SECURITY:
 * - We capture (not just verify) the PayPal order — this moves the money
 * - We look up payment by paypalOrderId (set during order creation)
 * - We use shared `fulfillOrder()` with idempotency guards
 *
 * PAYPAL QUIRK: "Approve" ≠ "Pay"
 * When the user approves on PayPal, the money is only authorized, not captured.
 * We must call the Capture API to actually collect the payment. If we skip
 * this step, the authorization expires after ~3 days and no money moves.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paypalProvider } from "@/lib/payments/paypal";
import { fulfillOrder, getRegistrySlugForOrder } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // PayPal order ID

  if (!token) {
    return NextResponse.redirect(new URL("/?payment=failed", req.url));
  }

  try {
    // Step 1: Capture the payment (verify + collect money)
    const result = await paypalProvider.verifyPayment({
      transactionId: token,
    });

    if (!result.success) {
      return NextResponse.redirect(new URL("/?payment=failed", req.url));
    }

    // Step 2: Find the payment by PayPal order ID
    const payment = await db.payment.findFirst({
      where: {
        paypalOrderId: token,
        provider: "PAYPAL",
      },
      select: { orderId: true, status: true },
    });

    if (!payment) {
      console.error(`PayPal: No payment found for order ${token}`);
      return NextResponse.redirect(new URL("/?payment=failed", req.url));
    }

    // Step 3: Update payment status
    await db.payment.update({
      where: { orderId: payment.orderId },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
        providerResponse: result.rawResponse as object,
      },
    });

    // Step 4: Fulfill the order (idempotent)
    await fulfillOrder(payment.orderId);

    // Step 5: Redirect to success page
    const slug = await getRegistrySlugForOrder(payment.orderId);
    const order = await db.order.findUnique({
      where: { id: payment.orderId },
      select: { orderNumber: true },
    });

    if (slug) {
      return NextResponse.redirect(
        new URL(`/r/${slug}/checkout/success?order=${order?.orderNumber}`, req.url)
      );
    }

    return NextResponse.redirect(new URL("/?payment=success", req.url));
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }
}
