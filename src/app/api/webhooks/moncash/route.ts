/**
 * MonCash return URL handler (configured in the MonCash merchant portal).
 * MonCash redirects the buyer here with ?transactionId=…. We retrieve the
 * transaction from MonCash, and its `reference` (the orderId we sent at
 * creation) decides which order it pays for, never a query param. Amount and
 * currency are checked by claimAndFulfill (review C4).
 */
import { NextRequest, NextResponse } from "next/server";
import { moncashProvider } from "@/lib/payments/moncash";
import { claimAndFulfill, getOrderRedirectTarget } from "@/lib/orders";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const transactionId = req.nextUrl.searchParams.get("transactionId");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/?payment=${reason}`, req.url));
  if (!transactionId || !/^[A-Za-z0-9-]{1,64}$/.test(transactionId)) return fail("failed");

  try {
    const verified = await moncashProvider.verify({ orderId: "", transactionId });
    const outcome = await claimAndFulfill(verified);
    if (outcome === "rejected") return fail("failed");
    const target = await getOrderRedirectTarget(verified.orderId);
    return NextResponse.redirect(new URL(target ?? "/?payment=success", req.url));
  } catch (err) {
    log.error("moncash return: error", { err });
    return fail("error");
  }
}
