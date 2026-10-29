/**
 * Move abandoned PENDING orders to EXPIRED (frees nothing — stock is only
 * decremented on fulfil — but keeps dashboards and reconcile cheap).
 * Natcash is manual: buyers get NATCASH_GRACE_HOURS from creation before the
 * order can expire, regardless of expiresAt.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const NATCASH_GRACE_HOURS = 72;

export async function expireOrders(now = new Date(), batch = 500): Promise<{ expired: number }> {
  const natcashCutoff = new Date(now.getTime() - NATCASH_GRACE_HOURS * 3_600_000);
  const candidates = await db.order.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
      NOT: { payment: { is: { OR: [{ captureRequestedAt: { not: null } }, { status: "COMPLETED" }] } } },
      OR: [
        { payment: { is: null } },
        { payment: { is: { provider: { not: "NATCASH" } } } },
        { payment: { is: { provider: "NATCASH" } }, createdAt: { lt: natcashCutoff } },
      ],
    },
    select: { id: true },
    take: batch,
  });
  if (candidates.length === 0) return { expired: 0 };
  const ids = candidates.map((c) => c.id);
  return db.$transaction(async (tx) => {
    // Take the order lock before the next statement reads capture state. If
    // capture just started, its committed hold is visible to this UPDATE.
    await tx.$queryRaw`SELECT id FROM orders WHERE id IN (${Prisma.join([...ids].sort())}) ORDER BY id FOR UPDATE`;
    // Re-check status in the UPDATE so a webhook that fulfilled meanwhile wins.
    const res = await tx.order.updateMany({ where: {
      id: { in: ids }, status: "PENDING",
      NOT: { payment: { is: { OR: [{ captureRequestedAt: { not: null } }, { status: "COMPLETED" }] } } },
    }, data: { status: "EXPIRED" } });
    await tx.payment.updateMany({
      where: { orderId: { in: ids }, status: { in: ["PENDING", "PROCESSING"] }, order: { status: "EXPIRED" } },
      data: { status: "FAILED" },
    });
    return { expired: res.count };
  });
}
