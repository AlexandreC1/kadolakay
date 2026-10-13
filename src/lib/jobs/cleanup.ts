/** Housekeeping: orphan uploads + data retention. */
import { db } from "@/lib/db";
import { log } from "@/lib/log";

export async function cleanupOrphanUploads(
  deleteFile: (key: string) => Promise<unknown>,
  now = new Date(),
  batch = 200,
): Promise<{ deleted: number; errors: number }> {
  const rows = await db.upload.findMany({
    where: { attachedAt: null, createdAt: { lt: new Date(now.getTime() - 24 * 3_600_000) } },
    select: { id: true, key: true },
    take: batch,
  });
  let deleted = 0;
  let errors = 0;
  for (const r of rows) {
    try {
      await deleteFile(r.key);
      await db.upload.delete({ where: { id: r.id } });
      deleted++;
    } catch (err) {
      errors++;
      log.warn("cleanup.upload_failed", { id: r.id, err });
    }
  }
  return { deleted, errors };
}

export async function applyRetention(now = new Date()) {
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
  const [emails, tokens] = await Promise.all([
    db.emailOutbox.deleteMany({ where: { status: "SENT", sentAt: { lt: days(30) } } }),
    db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
  ]);
  return { emailsDeleted: emails.count, tokensDeleted: tokens.count };
}
