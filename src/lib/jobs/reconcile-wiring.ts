/**
 * Wiring point for reconcile-payments. WS1 (src/lib/payments, src/lib/orders)
 * is merged separately; after it lands, replace the body with:
 *
 *   import { getVerifier } from "@/lib/payments";
 *   import { claimAndFulfill } from "@/lib/orders";
 *   return { verifiers: { STRIPE: getVerifier("STRIPE"), PAYPAL: getVerifier("PAYPAL"),
 *            MONCASH: getVerifier("MONCASH") }, claimAndFulfill };
 *
 * Until then the cron reports "not_wired" (HTTP 200) instead of guessing.
 */
import type { ReconcileDeps } from "./reconcile-payments";

export async function getReconcileDeps(): Promise<ReconcileDeps | null> {
  return null;
}
