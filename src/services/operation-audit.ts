import type { Prisma } from "@prisma/client";
export async function auditOperation(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  entityType: string,
  targetId: string,
  previousValue?: string,
  nextValue?: string,
) {
  await tx.operationAuditEvent.create({
    data: { actorId, action, entityType, targetId, previousValue, nextValue },
  });
}
