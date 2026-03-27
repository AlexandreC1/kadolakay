/**
 * =============================================================================
 * MonCash Return URL Handler
 * =============================================================================
 *
 * HOW MONCASH WORKS:
 * 1. User clicks "Pay with MonCash" → we call MonCash API to create a payment
 * 2. MonCash returns a redirect URL → user goes to MonCash site to pay
 * 3. After payment, MonCash redirects user back HERE with a `transactionId`
 * 4. We verify the transaction with MonCash API
 * 5. If valid → fulfill the order → redirect user to success page
 *
 * SECURITY:
 * - We verify the transactionId with MonCash API (not just trusting the param)
 * - We look up the payment by its moncashTxId (set during order creation)
 * - We use the shared `fulfillOrder()` which has idempotency guards
 * - If anything fails, user is redirected to an error page (not a 500)
 *
 * WHY GET AND NOT POST?
 * MonCash redirects the user's browser back to our site. Browser redirects
 * are always GET requests. This is a return URL, not a server-to-server webhook.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moncashProvider } from "@/lib/payments/moncash";
import { fulfillOrder, getRegistrySlugForOrder } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.redirect(new URL("/?payment=failed", req.url));
  }

  try {
    // Step 1: Verify with MonCash API that this transaction is real and paid
    const result = await moncashProvider.verifyPayment({ transactionId });

    if (!result.success) {
      return NextResponse.redirect(new URL("/?payment=failed", req.url));
    }

    // Step 2: Find the payment record by its MonCash transaction ID.
    // SECURITY: We match by moncashTxId, not by "most recent MONCASH payment".
    // This prevents an attacker from using someone else's transactionId
    // to fulfill a different order.
    const payment = await db.payment.findFirst({
      where: {
        provider: "MONCASH",
        moncashTxId: transactionId,
      },
      select: { orderId: true, status: true },
    });

    if (!payment) {
      console.error(`MonCash: No payment found for txId ${transactionId}`);
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

    // Step 4: Fulfill the order (idempotent — safe to call twice)
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
    console.error("MonCash webhook error:", error);
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }
}
