// Optional recovery only. Signed webhooks are the primary payment signal.
export default async function reconcilePayments() {
  const env = process.env;
  if (env.RECONCILIATION_ENABLED !== "true" || !env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return new Response(null, { status: 204 });
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) throw new Error("Reconciliation configuration incomplete");
  const base = new URL(env.NEXT_PUBLIC_APP_URL || "");
  if (base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error("Reconciliation origin invalid");
  const result = await fetch(new URL("/api/internal/payments/reconcile", base), {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    redirect: "error", signal: AbortSignal.timeout(24000),
  });
  if (!result.ok) throw new Error("Reconciliation needs operator review");
  return new Response(null, { status: 204 });
}
