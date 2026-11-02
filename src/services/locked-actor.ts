import type { Prisma } from "@prisma/client";
import { canPerform, type Permission } from "./permissions";
export async function lockActor(
  tx: Prisma.TransactionClient,
  id: string,
  permission: Permission,
) {
  await tx.$queryRaw`SELECT id FROM users WHERE id=${id} FOR SHARE`;
  const actor = await tx.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true },
  });
  if (!actor || actor.suspendedAt || !canPerform(actor.role, permission))
    throw new Error("Forbidden");
  return actor;
}
