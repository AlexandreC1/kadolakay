import { db } from "@/lib/db";
import { z } from "zod";
import { palettes, premiumActive } from "@/lib/seasons";
import { parseEntityId } from "@/lib/validators/entity-id";
import { merchantProviderSchema } from "./payment-foundation";
import { canPerform } from "./permissions";

export async function requestMerchantPaymentSetup(
  actorId: string,
  provider: unknown,
) {
  actorId = parseEntityId(actorId);
  const chosen = merchantProviderSchema.parse(provider);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR SHARE`;
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    if (!actor || !canPerform(actor.role, "payment:setup"))
      throw new Error("Forbidden");
    await tx.$queryRaw`SELECT id FROM businesses WHERE "ownerId" = ${actorId} FOR UPDATE`;
    const business = await tx.business.findFirst({
      where: { ownerId: actorId, status: { not: "SUSPENDED" } },
      select: { id: true },
    });
    if (!business) throw new Error("MERCHANT_UNAVAILABLE");
    // A preference is never a provider verification or a settlement instruction.
    await tx.merchantPaymentProfile.upsert({
      where: { businessId: business.id },
      create: { businessId: business.id, provider: chosen },
      update: { provider: chosen, requestedAt: new Date() },
    });
  });
}
export async function getPremiumAccess(userId: string) {
  const grant = await db.premiumGrant.findUnique({
    where: { userId: parseEntityId(userId) },
    select: { expiresAt: true },
  });
  return { active: premiumActive(grant), expiresAt: grant?.expiresAt ?? null };
}
export async function grantPremium(
  actorId: string,
  targetId: string,
  expiresAt: Date,
) {
  actorId = parseEntityId(actorId);
  targetId = parseEntityId(targetId);
  z.date()
    .refine(
      (d) =>
        d.getTime() > Date.now() && d.getTime() <= Date.now() + 366 * 86400000,
    )
    .parse(expiresAt);
  await db.$transaction(async (tx) => {
    // Sorted locks prevent two administrators granting to each other from deadlocking.
    const ids = [...new Set([actorId, targetId])].sort();
    for (const id of ids)
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    if (actor?.role !== "SUPERADMIN") throw new Error("Forbidden");
    if (
      !(await tx.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      }))
    )
      throw new Error("ACCOUNT_UNAVAILABLE");
    await tx.premiumGrant.upsert({
      where: { userId: targetId },
      create: { userId: targetId, expiresAt },
      update: { expiresAt },
    });
    await tx.premiumAuditEvent.create({
      data: { actorId, targetId, expiresAt },
    });
  });
}
export async function revokePremium(actorId: string, targetId: string) {
  actorId = parseEntityId(actorId);
  targetId = parseEntityId(targetId);
  await db.$transaction(async (tx) => {
    for (const id of [...new Set([actorId, targetId])].sort())
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    if (
      (
        await tx.user.findUnique({
          where: { id: actorId },
          select: { role: true },
        })
      )?.role !== "SUPERADMIN"
    )
      throw new Error("Forbidden");
    const expiresAt = new Date();
    const result = await tx.premiumGrant.updateMany({
      where: { userId: targetId, expiresAt: { gt: expiresAt } },
      data: { expiresAt },
    });
    if (result.count)
      await tx.premiumAuditEvent.create({
        data: { actorId, targetId, expiresAt },
      });
  });
}
export async function personalizeRegistry(
  actorId: string,
  registryId: string,
  palette: unknown,
) {
  actorId = parseEntityId(actorId);
  registryId = parseEntityId(registryId);
  const chosen = z.enum(palettes).parse(palette);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR SHARE`;
    const grant = await tx.premiumGrant.findUnique({
      where: { userId: actorId },
      select: { expiresAt: true },
    });
    if (chosen !== "mint" && !premiumActive(grant))
      throw new Error("PREMIUM_REQUIRED");
    const result = await tx.registry.updateMany({
      where: { id: registryId, userId: actorId, status: { not: "ARCHIVED" } },
      data: { palette: chosen },
    });
    if (!result.count) throw new Error("REGISTRY_UNAVAILABLE");
  });
}
export async function registryInsights(actorId: string) {
  actorId = parseEntityId(actorId);
  if (!(await getPremiumAccess(actorId)).active)
    throw new Error("PREMIUM_REQUIRED");
  // Aggregate on the server. No guest names, addresses, payment tokens or raw events.
  return db.$queryRaw<
    {
      id: string;
      title: string;
      slug: string;
      requested: bigint;
      fulfilled: bigint;
      held: bigint;
    }[]
  >`
    SELECT r.id, r.title, r.slug, COALESCE(SUM(i.quantity),0)::bigint AS requested,
      COALESCE(SUM(i."fulfilledQty"),0)::bigint AS fulfilled, COALESCE(SUM(i."reservedQty"),0)::bigint AS held
    FROM registries r LEFT JOIN registry_items i ON i."registryId"=r.id
    WHERE r."userId"=${actorId} AND r.status <> 'ARCHIVED'
    GROUP BY r.id ORDER BY r."updatedAt" DESC, r.id LIMIT 30
  `;
}
