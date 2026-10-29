/**
 * PayPal return URL handler. PayPal redirects the buyer here with ?token=<PayPal order id>
 * after approval. We CAPTURE the order (money only moves on capture, review C3),
 * then claimAndFulfill() checks orderId, amount and currency before fulfilling.
 * Capture requires a persisted reservation; expired checkouts cannot start one.
 * Reloads are safe: capture is idempotent (PayPal-Request-Id / ORDER_ALREADY_CAPTURED)
 * and the claim is unique per (provider, transaction).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paypalInspector, paypalProvider } from "@/lib/payments/paypal";
import { claimAndFulfill, getOrderRedirectTarget } from "@/lib/orders";
import { releaseVoidedPayPal, reservePayPalCapture } from "@/lib/payments/reservations";
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

    {
      let verified = await paypalInspector.verify({ orderId: payment.orderId, providerRef: token });
      if (verified.orderId !== payment.orderId) return fail("failed");
      if (verified.status === "FAILED") {
        if (verified.rawSummary.orderStatus === "VOIDED") await releaseVoidedPayPal(payment.orderId);
        return fail("failed");
      }
      // Do not create indefinite holds for CREATED/unapproved provider orders,
      // or submit a second capture while an existing capture is settling.
      if (verified.status === "PENDING" && verified.rawSummary.captureStatus === "PENDING") {
        const target = await getOrderRedirectTarget(payment.orderId);
        return NextResponse.redirect(new URL(target ?? "/?payment=pending", req.url));
      }
      if (verified.status !== "COMPLETED" && verified.rawSummary.orderStatus !== "APPROVED") return fail("unavailable");
      // verify() CAPTURES. A buyer coming back after the order expired may be
      // paying for gifts someone else gave meanwhile: don't take that money.
      if (verified.status !== "COMPLETED" && !(await reservePayPalCapture(payment.orderId))) {
        log.warn("paypal return: order no longer fits, not capturing", { orderId: payment.orderId });
        return fail("unavailable");
      }
      if (verified.status !== "COMPLETED") verified = await paypalProvider.verify({ orderId: payment.orderId, providerRef: token });
      // The capture must be for the order we looked up, not one chosen by the caller.
      if (verified.orderId !== payment.orderId) {
        log.error("paypal return: reference_id mismatch", { orderId: payment.orderId });
        return fail("failed");
      }
      if (verified.status === "PENDING") {
        const target = await getOrderRedirectTarget(payment.orderId);
        return NextResponse.redirect(new URL(target ?? "/?payment=pending", req.url));
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
