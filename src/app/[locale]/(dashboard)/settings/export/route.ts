/**
 * GET /<locale>/settings/export — download "my data" as JSON (plan WS6 task 2).
 *
 * Streams the export directly to the signed-in user instead of S3 + emailed
 * link: same data, no long-lived file holding PII, no extra bucket policy.
 * Limited to one export per 24h (AuditLog-backed, works without Redis).
 * Other people's contact details (buyer email/phone on gifts received) are
 * NOT included — only what the user provided or is entitled to see in-app.
 */
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildUserExport, EXPORT_WINDOW_MS } from "./build";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const recent = await db.auditLog.count({
    where: { actorId: userId, action: "user.data_export", createdAt: { gt: new Date(Date.now() - EXPORT_WINDOW_MS) } },
  });
  if (recent > 0) {
    return Response.json({ error: "rate_limited", retryAfterHours: 24 }, { status: 429 });
  }

  const data = await buildUserExport(userId);
  await db.auditLog.create({ data: { actorId: userId, action: "user.data_export", targetType: "user", targetId: userId } });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kadolakay-export-${day}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
