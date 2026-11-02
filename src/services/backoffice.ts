import { z } from "zod";
import { db } from "@/lib/db";
import { entityIdSchema, parseEntityId } from "@/lib/validators/entity-id";
import { lockActor } from "./locked-actor";
import { auditOperation } from "./operation-audit";

export const accountSearchSchema = z.strictObject({
  q: z.string().trim().max(80).default(""),
  after: entityIdSchema.optional(),
});
export async function listAdminAccounts(input: unknown) {
  const data = accountSearchSchema.parse(input);
  const rows = await db.user.findMany({
    where: {
      ...(data.after ? { id: { gt: data.after } } : {}),
      ...(data.q
        ? {
            OR: [
              { id: data.q },
              { email: { contains: data.q, mode: "insensitive" } },
              { name: { contains: data.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspendedAt: true,
      createdAt: true,
      business: { select: { id: true } },
    },
    orderBy: { id: "asc" },
    take: 21,
  });
  return {
    items: rows.slice(0, 20),
    next: rows.length > 20 ? rows[19].id : null,
  };
}
export async function changeAccount(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = z
    .strictObject({
      targetId: entityIdSchema,
      operation: z.enum(["SUSPEND", "RESTORE", "ROLE"]),
      role: z.enum(["USER", "BUSINESS_OWNER", "ADMIN"]).optional(),
    })
    .parse(input);
  if (actorId === data.targetId) throw new Error("OWNER_PROTECTED");
  if (data.operation === "ROLE" && !data.role) throw new Error("ROLE_REQUIRED");
  await db.$transaction(async (tx) => {
    for (const id of [actorId, data.targetId].sort())
      await tx.$queryRaw`SELECT id FROM users WHERE id=${id} FOR UPDATE`;
    await lockActor(tx, actorId, "admin:user");
    const target = await tx.user.findUnique({
      where: { id: data.targetId },
      select: {
        id: true,
        role: true,
        suspendedAt: true,
        business: { select: { id: true, status: true } },
      },
    });
    if (!target) throw new Error("ACCOUNT_UNAVAILABLE");
    if (target.role === "SUPERADMIN") throw new Error("OWNER_PROTECTED");
    if (data.operation === "ROLE") {
      if (target.role === data.role) return;
      if (data.role === "USER" && target.business)
        throw new Error("BUSINESS_ROLE_REQUIRED");
      await tx.user.update({
        where: { id: target.id },
        data: { role: data.role, sessionVersion: { increment: 1 } },
      });
      await tx.userRoleAuditEvent.create({
        data: {
          actorId,
          targetId: target.id,
          previousRole: target.role,
          nextRole: data.role!,
          source: "ADMIN_CONSOLE",
        },
      });
      await auditOperation(
        tx,
        actorId,
        "ACCOUNT_ROLE_CHANGED",
        "USER",
        target.id,
        target.role,
        data.role,
      );
    } else {
      const suspend = data.operation === "SUSPEND";
      if (Boolean(target.suspendedAt) === suspend) return;
      await tx.user.update({
        where: { id: target.id },
        data: {
          suspendedAt: suspend ? new Date() : null,
          sessionVersion: { increment: 1 },
        },
      });
      if (
        suspend &&
        target.business &&
        target.business.status !== "SUSPENDED"
      ) {
        await tx.business.update({
          where: { id: target.business.id },
          data: { status: "SUSPENDED" },
        });
        await tx.securityAuditEvent.create({
          data: {
            actorId,
            action: "BUSINESS_STATUS_CHANGED",
            targetId: target.business.id,
            previousStatus: target.business.status,
            nextStatus: "SUSPENDED",
          },
        });
      }
      await auditOperation(
        tx,
        actorId,
        "ACCOUNT_STATUS_CHANGED",
        "USER",
        target.id,
        target.suspendedAt ? "SUSPENDED" : "ACTIVE",
        suspend ? "SUSPENDED" : "ACTIVE",
      );
    }
    await tx.deviceSession.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date(), mfaVerifiedUntil: null },
    });
  });
}
export async function adminOverview() {
  const [
    users,
    registries,
    products,
    businesses,
    payments,
    fulfillments,
    requests,
  ] = await Promise.all([
    db.user.count(),
    db.registry.count({ where: { status: { not: "ARCHIVED" } } }),
    db.product.count(),
    db.business.groupBy({ by: ["status"], _count: true }),
    db.payment.groupBy({
      by: ["currency"],
      where: { status: "COMPLETED" },
      _sum: { amountUSD: true, amountHTG: true },
      _count: true,
    }),
    db.merchantFulfillment.groupBy({ by: ["state"], _count: true }),
    db.refundRequest.count({ where: { state: "REQUESTED" } }),
  ]);
  return {
    users,
    registries,
    products,
    businesses,
    payments: payments.map((p) => ({
      currency: p.currency,
      count: p._count,
      amount:
        (p.currency === "USD"
          ? p._sum.amountUSD
          : p._sum.amountHTG
        )?.toString() || "0",
    })),
    fulfillments,
    requests,
  };
}
export async function readAudit(input: unknown) {
  const data = z
    .strictObject({
      after: entityIdSchema.optional(),
      target: z.string().trim().max(100).default(""),
    })
    .parse(input);
  const cursor = data.after
    ? await db.operationAuditEvent.findUnique({
        where: { id: data.after },
        select: { createdAt: true, id: true },
      })
    : null;
  const rows = await db.operationAuditEvent.findMany({
    where: {
      ...(data.target ? { targetId: data.target } : {}),
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
      actorId: true,
      action: true,
      entityType: true,
      targetId: true,
      previousValue: true,
      nextValue: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
  });
  return {
    items: rows.slice(0, 30),
    next: rows.length > 30 ? rows[29].id : null,
  };
}
