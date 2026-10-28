/**
 * Reconcile PENDING payments whose webhook never arrived (review M: lost
 * webhooks). For each, ask the provider (verifier.verify) and hand a
 * COMPLETED result to claimAndFulfill — the same idempotent path the webhooks
 * use, so a late webhook after reconcile is a harmless "duplicate".
 *
 * Dependencies are injected: verifiers + claimAndFulfill are WS1's
 * (src/lib/payments, src/lib/orders). The cron route wires them once WS1 is
 * merged — see src/lib/jobs/reconcile-wiring.ts.
 */
import type { ClaimAndFulfill, ClaimOutcome, PaymentVerifier, Provider } from "@/lib/contracts/payments";
import { db } from "@/lib/db";
import { log } from "@/lib/log";

export interface ReconcileDeps {
  verifiers: Partial<Record<Provider, PaymentVerifier>>;
  claimAndFulfill: ClaimAndFulfill;
}

export interface PendingPaymentRow {
  orderId: string;
  provider: Provider;
  providerRef: string | null;
}

export interface ReconcileResult {
  checked: number;
  outcomes: Record<ClaimOutcome | "pending" | "failed" | "error" | "skipped", number>;
}

/** Natcash is manual (admin confirm) — never auto-reconciled. */
const AUTO: Provider[] = ["STRIPE", "PAYPAL", "MONCASH"];

export async function loadPendingPayments(now: Date, minAgeMs = 10 * 60_000, batch = 100): Promise<PendingPaymentRow[]> {
  const rows = await db.payment.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
      provider: { in: AUTO },
      createdAt: { lt: new Date(now.getTime() - minAgeMs), gt: new Date(now.getTime() - 7 * 86_400_000) },
      order: { status: { in: ["PENDING", "EXPIRED"] } },
    },
    select: { orderId: true, provider: true, stripePaymentId: true, paypalOrderId: true, moncashTxId: true },
    orderBy: { createdAt: "asc" },
    take: batch,
  });
  return rows.map((r) => ({
    orderId: r.orderId,
    provider: r.provider as Provider,
    providerRef: r.stripePaymentId ?? r.paypalOrderId ?? r.moncashTxId ?? null,
  }));
}

export async function reconcilePayments(rows: PendingPaymentRow[], deps: ReconcileDeps): Promise<ReconcileResult> {
  const outcomes: ReconcileResult["outcomes"] = { fulfilled: 0, duplicate: 0, rejected: 0, needs_refund: 0, pending: 0, failed: 0, error: 0, skipped: 0 };
  for (const row of rows) {
    const verifier = deps.verifiers[row.provider];
    if (!verifier || !AUTO.includes(row.provider)) {
      outcomes.skipped++;
      continue;
    }
    try {
      const verified = await verifier.verify({ orderId: row.orderId, providerRef: row.providerRef ?? undefined });
      if (verified.orderId !== row.orderId) {
        outcomes.rejected++;
        log.error("reconcile.order_mismatch", { orderId: row.orderId, provider: row.provider });
        continue;
      }
      if (verified.status === "PENDING") outcomes.pending++;
      else if (verified.status === "FAILED") outcomes.failed++;
      else outcomes[await deps.claimAndFulfill(verified)]++;
    } catch (err) {
      outcomes.error++;
      log.warn("reconcile.verify_failed", { orderId: row.orderId, provider: row.provider, err });
    }
  }
  return { checked: rows.length, outcomes };
}
