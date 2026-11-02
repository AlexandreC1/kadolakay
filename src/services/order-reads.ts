import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { canPerform } from "./permissions";
import type { Prisma } from "@prisma/client";
export function merchantLines(businessId: string): Prisma.OrderItemWhereInput {
  return {
    OR: [
      { product: { businessId } },
      { productId: null, registryItem: { businessId } },
    ],
  };
}
export async function merchantOrders(actorId: string, after?: string) {
  actorId = parseEntityId(actorId);
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true, suspendedAt: true },
  });
  if (!actor || actor.suspendedAt || !canPerform(actor.role, "order:fulfill"))
    throw new Error("Forbidden");
  const business = await db.business.findUnique({
    where: { ownerId: actorId },
    select: { id: true, name: true },
  });
  if (!business) return null;
  const where: Prisma.OrderWhereInput = {
    items: { some: merchantLines(business.id) },
    payment: { status: "COMPLETED" },
  };
  const cursor = after
    ? await db.order.findFirst({
        where: { ...where, id: parseEntityId(after) },
        select: { id: true, createdAt: true },
      })
    : null;
  const orders = await db.order.findMany({
    where: {
      ...where,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      items: {
        where: merchantLines(business.id),
        select: {
          id: true,
          quantity: true,
          priceUSD: true,
          priceHTG: true,
          registryItem: { select: { title: true } },
        },
        take: 20,
      },
      fulfillments: {
        where: { businessId: business.id },
        select: { state: true, method: true, instructions: true },
        take: 1,
      },
      refundRequests: {
        where: { businessId: business.id },
        select: { id: true, state: true, kind: true, reason: true },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
  });
  return {
    business,
    items: orders.slice(0, 20),
    next: orders.length > 20 ? orders[19].id : null,
  };
}
export async function buyerPurchases(userId: string, after?: string) {
  userId = parseEntityId(userId);
  const cursor = after
    ? await db.order.findFirst({
        where: { id: parseEntityId(after), buyerId: userId },
        select: { createdAt: true, id: true },
      })
    : null;
  const rows = await db.order.findMany({
    where: {
      buyerId: userId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      payment: { select: { currency: true, status: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
  });
  return {
    items: rows.slice(0, 20),
    next: rows.length > 20 ? rows[19].id : null,
  };
}
