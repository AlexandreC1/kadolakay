import { z } from "zod";
import { db } from "@/lib/db";
import { entityIdSchema, parseEntityId } from "@/lib/validators/entity-id";
import { canPerform } from "./permissions";
import { recordOperationalEvent } from "@/lib/operational-events";
const reviewSchema = z.strictObject({ businessId: entityIdSchema, status: z.enum(["APPROVED", "SUSPENDED"]) });

export async function reviewBusiness(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = reviewSchema.parse(input);
  const started = Date.now();
  const changed = await db.$transaction(async tx => {
    // Role changes must wait until this privileged decision and audit commit.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR SHARE`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor || !canPerform(actor.role, "admin:business")) throw new Error("Forbidden");
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${data.businessId} FOR UPDATE`;
    const business = await tx.business.findUnique({ where: { id: data.businessId }, select: { status: true } });
    if (!business) throw new Error("Business unavailable");
    if (business.status === data.status) return false;
    await tx.business.update({ where: { id: data.businessId }, data: { status: data.status } });
    await tx.securityAuditEvent.create({ data: { actorId, action: "BUSINESS_STATUS_CHANGED", targetId: data.businessId, previousStatus: business.status, nextStatus: data.status } });
    return true;
  });
  recordOperationalEvent("business_review", { outcome: "ok", count: changed ? 1 : 0, durationMs: Date.now() - started });
  return { changed };
}
