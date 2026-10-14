import { isAuthorizedCron, unauthorized } from "@/lib/jobs/cron-auth";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { loadPendingPayments, reconcilePayments } from "@/lib/jobs/reconcile-payments";
import { getReconcileDeps } from "@/lib/jobs/reconcile-wiring";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorized();
  const deps = await getReconcileDeps();
  if (!deps) return Response.json({ status: "not_wired" });
  const result = await reconcilePayments(await loadPendingPayments(new Date()), deps);
  log.info("cron.reconcile_payments", { checked: result.checked, ...result.outcomes });
  return Response.json(result);
}
