import { isAuthorizedCron, unauthorized } from "@/lib/jobs/cron-auth";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { drainOutbox } from "@/lib/email/outbox";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorized();
  const result = await drainOutbox({ batch: 100 });
  log.info("cron.send_emails", { ...result });
  return Response.json(result);
}
