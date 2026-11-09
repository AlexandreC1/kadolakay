import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { lockActor } from "./locked-actor";

/**
 * "I'll give this": a signed-in guest promises a gift and buys or brings it
 * themselves. No money moves through Bayou, so this is allowed while checkout is
 * off. Active pledges count in the item's fulfilledQty, which keeps every
 * progress view, the guest filters and checkout availability consistent.
 */
export class PledgeError extends Error {
  constructor(public readonly code: "INVALID" | "UNAVAILABLE" | "OWN_LIST" | "NOT_ENOUGH" | "NOT_FOUND") {
    super(code);
  }
}

export const pledgeSchema = z.strictObject({
  quantity: z.number().int().min(1).max(1000),
  anonymous: z.boolean().default(false),
  message: z.string().trim().max(500).optional(),
});

function statusFor(quantity: number, given: number) {
  return given >= quantity ? "FULFILLED" as const : given > 0 ? "PARTIALLY_FULFILLED" as const : "AVAILABLE" as const;
}

async function lockItem(tx: Prisma.TransactionClient, itemId: string) {
  await tx.$queryRaw`SELECT id FROM registry_items WHERE id = ${itemId} FOR UPDATE`;
  return tx.registryItem.findUnique({
    where: { id: itemId },
    select: {
      id: true, quantity: true, fulfilledQty: true, reservedQty: true, registryId: true,
      registry: { select: { userId: true, status: true, isPublic: true, visibility: true, password: true, user: { select: { suspendedAt: true } } } },
    },
  });
}

export async function pledgeGift(actorId: string, itemId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  itemId = parseEntityId(itemId);
  const parsed = pledgeSchema.safeParse(input);
  if (!parsed.success) throw new PledgeError("INVALID");
  const { quantity, anonymous, message } = parsed.data;
  return db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "gift:pledge");
    const item = await lockItem(tx, itemId);
    const r = item?.registry;
    // Only lists a guest can open by link: published, not private, not password protected.
    if (!item || !r || r.status !== "PUBLISHED" || !r.isPublic || r.password || r.user.suspendedAt
      || !["PUBLIC", "UNLISTED"].includes(r.visibility)) throw new PledgeError("UNAVAILABLE");
    if (r.userId === actorId) throw new PledgeError("OWN_LIST");
    const available = item.quantity - item.fulfilledQty - item.reservedQty;
    if (quantity > available) throw new PledgeError("NOT_ENOUGH");
    const pledge = await tx.giftPledge.create({
      data: { itemId, registryId: item.registryId, userId: actorId, quantity, isAnonymous: anonymous, message: message || null },
      select: { id: true, createdAt: true },
    });
    const given = item.fulfilledQty + quantity;
    await tx.registryItem.update({ where: { id: itemId }, data: { fulfilledQty: given, status: statusFor(item.quantity, given) } });
    return pledge;
  });
}

/** A guest can take back their own promise; the units become available again. */
export async function cancelPledge(actorId: string, pledgeId: string) {
  actorId = parseEntityId(actorId);
  pledgeId = parseEntityId(pledgeId);
  await db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "gift:pledge");
    const pledge = await tx.giftPledge.findUnique({ where: { id: pledgeId }, select: { userId: true, itemId: true, quantity: true, cancelledAt: true } });
    if (!pledge || pledge.userId !== actorId || pledge.cancelledAt) throw new PledgeError("NOT_FOUND");
    const item = await lockItem(tx, pledge.itemId);
    if (!item) throw new PledgeError("NOT_FOUND");
    const again = await tx.giftPledge.updateMany({ where: { id: pledgeId, cancelledAt: null }, data: { cancelledAt: new Date() } });
    if (!again.count) throw new PledgeError("NOT_FOUND");
    const given = Math.max(0, item.fulfilledQty - pledge.quantity);
    await tx.registryItem.update({ where: { id: item.id }, data: { fulfilledQty: given, status: statusFor(item.quantity, given) } });
  });
}

/** What this person promised, newest first. */
export async function listOwnPledges(actorId: string) {
  actorId = parseEntityId(actorId);
  return db.giftPledge.findMany({
    where: { userId: actorId, cancelledAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, quantity: true, message: true, isAnonymous: true, createdAt: true,
      item: { select: { id: true, title: true, priceHTG: true, priceUSD: true, productId: true, business: { select: { slug: true, name: true } } } },
      registry: { select: { slug: true, title: true, user: { select: { name: true } } } },
    },
  });
}

/**
 * Who promised what on a list, for its owner only. A guest who chose to stay
 * anonymous is never named, not even to the owner.
 */
export async function listPledgesForOwner(actorId: string, registryId: string) {
  actorId = parseEntityId(actorId);
  registryId = parseEntityId(registryId);
  const rows = await db.giftPledge.findMany({
    where: { registryId, cancelledAt: null, registry: { userId: actorId } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, itemId: true, quantity: true, isAnonymous: true, message: true, createdAt: true, user: { select: { name: true } } },
  });
  return rows.map(({ user, isAnonymous, ...p }) => ({ ...p, isAnonymous, name: isAnonymous ? null : user.name ?? null }));
}
