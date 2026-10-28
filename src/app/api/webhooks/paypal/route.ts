/**
 * PayPal return URL handler. PayPal redirects the buyer here with ?token=<PayPal order id>
 * after approval. We CAPTURE the order (money only moves on capture, review C3),
 * then claimAndFulfill() checks orderId, amount and currency before fulfilling.
 * A late return whose items were gifted meanwhile is NOT captured (orderStillFits).
 * Reloads are safe: capture is idempotent (PayPal-Request-Id / ORDER_ALREADY_CAPTURED)
 * and the claim is unique per (provider, transaction).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paypalProvider } from "@/lib/payments/paypal";
import { claimAndFulfill, getOrderRedirectTarget, orderStillFits } from "@/lib/orders";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/?payment=${reason}`, req.url));
  if (!token || !/^[A-Z0-9]{5,40}$/i.test(token)) return fail("failed");

  try {
    const payment = await db.payment.findFirst({
      where: { paypalOrderId: token, provider: "PAYPAL" },
      select: { orderId: true, status: true },
    });
    if (!payment) {
      log.warn("paypal return: unknown PayPal order");
      return fail("failed");
    }

    if (payment.status !== "COMPLETED") {
      // verify() CAPTURES. A buyer coming back after the order expired may be
      // paying for gifts someone else gave meanwhile: don't take that money.
      if (!(await orderStillFits(payment.orderId))) {
        log.warn("paypal return: order no longer fits, not capturing", { orderId: payment.orderId });
        return fail("unavailable");
      }
      const verified = await paypalProvider.verify({ orderId: payment.orderId, providerRef: token });
      // The capture must be for the order we looked up, not one chosen by the caller.
      if (verified.orderId !== payment.orderId) {
        log.error("paypal return: reference_id mismatch", { orderId: payment.orderId });
        return fail("failed");
      }
      const outcome = await claimAndFulfill(verified);
      if (outcome === "rejected") return fail("failed");
    }

    const target = await getOrderRedirectTarget(payment.orderId);
    return NextResponse.redirect(new URL(target ?? "/?payment=success", req.url));
  } catch (err) {
    log.error("paypal return: error", { err });
    return fail("error");
  }
}
