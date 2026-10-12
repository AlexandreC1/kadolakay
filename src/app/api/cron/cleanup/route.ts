import { isAuthorizedCron, unauthorized } from "@/lib/jobs/cron-auth";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { applyRetention, cleanupOrphanUploads } from "@/lib/jobs/cleanup";
import { deleteFile } from "@/lib/storage";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorized();
  const uploads = await cleanupOrphanUploads(deleteFile);
  const retention = await applyRetention();
  log.info("cron.cleanup", { ...uploads, ...retention });
  return Response.json({ uploads, retention });
}
