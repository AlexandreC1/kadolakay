/**
 * Wiring for reconcile-payments: WS1's provider verifiers + claimAndFulfill.
 * Natcash is deliberately absent (manual admin confirmation only).
 * MonCash is absent for now: we only store its payment *token* at checkout,
 * and verify() needs the transactionId that arrives on the return URL. A
 * lost MonCash return needs RetrieveOrderPayment (by orderId) — add it after
 * a sandbox check, then list "moncash" here. Until then those rows count as
 * "skipped" in the cron output.
 */
import { getPaymentProvider, type PaymentProviderType } from "@/lib/payments";
import { claimAndFulfill } from "@/lib/orders";
import type { ReconcileDeps } from "./reconcile-payments";

const AUTO: PaymentProviderType[] = ["stripe", "paypal"];

export async function getReconcileDeps(): Promise<ReconcileDeps | null> {
  const verifiers: ReconcileDeps["verifiers"] = {};
  for (const p of AUTO) {
    // Still reconcile a provider that was just disabled: its pending payments may have settled.
    const v = getPaymentProvider(p);
    verifiers[v.provider] = v;
  }
  return { verifiers, claimAndFulfill };
}
