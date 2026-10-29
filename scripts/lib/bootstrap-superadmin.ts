import { db } from "../../src/lib/db";
import { parseEntityId } from "../../src/lib/validators/entity-id";

/** Operator-only bootstrap. Never import into a route or Server Action. */
export async function bootstrapSuperadmin(userId: string) {
  userId = parseEntityId(userId);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended('bayou:owner-bootstrap', 0))`;
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, accounts: { select: { provider: true } } } });
    if (!user || !user.accounts.length) throw new Error("ACCOUNT_WITH_LINKED_PROVIDER_REQUIRED");
    if (await tx.user.findFirst({ where: { role: "SUPERADMIN", id: { not: userId } }, select: { id: true } })) throw new Error("OWNER_ALREADY_BOOTSTRAPPED");
    if (user.role === "SUPERADMIN") return { changed: false, role: "SUPERADMIN" as const };
    await tx.user.update({ where: { id: userId }, data: { role: "SUPERADMIN" } });
    await tx.userRoleAuditEvent.create({ data: { actorId: userId, targetId: userId, previousRole: user.role, nextRole: "SUPERADMIN", source: "OPERATOR_BOOTSTRAP" } });
    return { changed: true, role: "SUPERADMIN" as const };
  });
}
