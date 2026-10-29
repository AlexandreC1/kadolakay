import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { reconcileStripeCheckouts } from "@/services/reconcile-payments";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || secret.length < 32 || supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await reconcileStripeCheckouts(process.env.NETLIFY === "true" ? { maxItems: 3, budgetMs: 12000 } : undefined);
    return NextResponse.json(result, { status: result.failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Payment reconciliation is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
