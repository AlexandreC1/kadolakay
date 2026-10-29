/**
 * Wiring for reconcile-payments: WS1's provider verifiers + claimAndFulfill.
 * Natcash is deliberately absent (manual admin confirmation only).
 * MonCash is looked up by our orderId (RetrieveOrderPayment), so a buyer who
 * paid but closed the tab before the return URL still gets their gift recorded.
 */
import { getPaymentProvider, type PaymentProviderType } from "@/lib/payments";
import { claimAndFulfill } from "@/lib/orders";
import type { ReconcileDeps } from "./reconcile-payments";
import { paypalInspector } from "@/lib/payments/paypal";

const AUTO: PaymentProviderType[] = ["stripe", "paypal", "moncash"];

export async function getReconcileDeps(): Promise<ReconcileDeps | null> {
  const verifiers: ReconcileDeps["verifiers"] = {};
  for (const p of AUTO) {
    // Still reconcile a provider that was just disabled: its pending payments may have settled.
    const v = getPaymentProvider(p);
    verifiers[v.provider] = v;
  }
  verifiers.PAYPAL = paypalInspector;
  return { verifiers, claimAndFulfill };
}
