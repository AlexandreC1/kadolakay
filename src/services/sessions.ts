import { db } from "@/lib/db";
import { canPerform } from "./permissions";
import { recordOperationalEvent } from "@/lib/operational-events";

/** Caller identity must come from requireActor, never a request-body user ID. */
export async function revokeOwnSessions(actorId: string): Promise<void> {
  try { await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR UPDATE`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor || !canPerform(actor.role, "session:revoke")) throw new Error("Please sign in again");
    await tx.user.update({ where: { id: actorId }, data: { sessionVersion: { increment: 1 } } });
    await tx.session.deleteMany({ where: { userId: actorId } });
    await tx.sessionRevocationEvent.create({ data: { actorId, targetId: actorId } });
  }); } catch (error) {
    recordOperationalEvent("session_revocation", { outcome: "failed" });
    throw error;
  }
  recordOperationalEvent("session_revocation", { outcome: "ok", count: 1 });
}
