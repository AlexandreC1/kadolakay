import { isAuthorizedCron, unauthorized } from "@/lib/jobs/cron-auth";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { expireOrders } from "@/lib/jobs/expire-orders";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorized();
  const result = await expireOrders();
  log.info("cron.expire_orders", result);
  return Response.json(result);
}
