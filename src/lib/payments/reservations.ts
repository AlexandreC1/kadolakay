import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/contracts/action";

/** Unknown capture outcomes retain their hold until verified or reviewed. */
export function reservationWhere(now: Date): Prisma.OrderWhereInput {
  return { status: "PENDING", OR: [
    { expiresAt: { gt: now } },
    { payment: { is: { captureRequestedAt: { not: null } } } },
    { payment: { is: { status: "COMPLETED" } } },
  ] };
}

type CatalogItem = { source: string; productId: string | null; businessId: string | null };

/** Lock the catalog rows through order creation so suspension/removal cannot race it. */
export async function assertCatalogAvailable(tx: Prisma.TransactionClient, items: CatalogItem[]) {
  const local = items.filter((i) => i.source === "LOCAL_BUSINESS");
  if (!local.length) return;
  if (local.some((i) => !i.productId || !i.businessId)) throw new ActionError("NOT_FOUND");
  const ids = [...new Set(local.map((i) => i.productId!))].sort();
  const rows = await tx.$queryRaw<{ id: string; businessId: string; inStock: boolean; deletedAt: Date | null; status: string }[]>`
    SELECT p.id, p."businessId", p."inStock", p."deletedAt", b.status
    FROM products p JOIN businesses b ON b.id = p."businessId"
    WHERE p.id IN (${Prisma.join(ids)}) ORDER BY p.id FOR SHARE OF p, b`;
  const products = new Map(rows.map((p) => [p.id, p]));
  if (local.some((i) => {
    const p = products.get(i.productId!);
    return !p || !p.inStock || p.deletedAt || p.status !== "APPROVED" || p.businessId !== i.businessId;
  })) throw new ActionError("NOT_FOUND");
}

/** Persist the capture hold before any request that may move money. No late captures. */
export async function reservePayPalCapture(orderId: string): Promise<boolean> {
  const snapshot = await db.order.findUnique({ where: { id: orderId }, select: { items: { select: { registryItemId: true } } } });
  if (!snapshot?.items.length) return false;
  const ids = [...new Set(snapshot.items.map((i) => i.registryItemId))].sort();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM registry_items WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payment: true, items: { include: { registryItem: true } } } });
    if (!order || order.status !== "PENDING" || order.payment?.provider !== "PAYPAL") return false;
    // A previous request may have captured successfully but lost the response.
    // Its persisted hold makes retrying the same provider order safe.
    if (order.payment.captureRequestedAt) return true;
    const now = new Date();
    if (!order.expiresAt || order.expiresAt <= now) return false;
    await assertCatalogAvailable(tx, order.items.map((i) => i.registryItem));
    const held = await tx.orderItem.groupBy({
      by: ["registryItemId"], where: { registryItemId: { in: ids }, orderId: { not: orderId }, order: reservationWhere(now) },
      _sum: { quantity: true },
    });
    const reserved = new Map(held.map((h) => [h.registryItemId, h._sum.quantity ?? 0]));
    if (order.items.some((i) => i.quantity + i.registryItem.fulfilledQty + (reserved.get(i.registryItemId) ?? 0) > i.registryItem.quantity)) return false;
    await tx.payment.update({ where: { orderId }, data: { captureRequestedAt: now } });
    return true;
  });
}

/** Only call after PayPal itself reports the order VOIDED, never on a timeout. */
export async function releaseVoidedPayPal(orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const result = await tx.order.updateMany({ where: {
      id: orderId, status: "PENDING",
      payment: { is: { provider: "PAYPAL", status: { in: ["PENDING", "PROCESSING", "FAILED"] } } },
    }, data: { status: "PAYMENT_FAILED" } });
    if (result.count) await tx.payment.update({ where: { orderId }, data: { status: "FAILED", captureRequestedAt: null } });
  });
}
