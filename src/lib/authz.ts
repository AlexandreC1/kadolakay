/**
 * Authorization helpers implementing src/lib/contracts/auth.ts.
 *
 * Not yet wired into existing actions (behaviour-safe Wave 0); Wave-1
 * workstreams migrate their actions to these. WS2 owns follow-up changes
 * (tokenVersion / ban checks also live in the JWT callback).
 */
import type { Role } from "@prisma/client";
import { auth } from "./auth";
import { db } from "./db";
import { AuthError } from "./contracts/action";
import type { AuthedUser, OwnedResource, RequireOwner, RequireRole, RequireUser } from "./contracts/auth";

export const requireUser: RequireUser = async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new AuthError("UNAUTHENTICATED");
  return { id, role: session.user.role ?? "USER" };
};

/** Fresh DB read: a stale JWT role can never grant a privileged action. */
async function loadActiveUser(id: string): Promise<AuthedUser> {
  const row = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, bannedAt: true, deletedAt: true },
  });
  if (!row || row.bannedAt || row.deletedAt) throw new AuthError("UNAUTHENTICATED");
  return { id: row.id, role: row.role };
}

export const requireRole: RequireRole = async (role) => {
  const { id } = await requireUser();
  const user = await loadActiveUser(id);
  const allowed: Role[] = Array.isArray(role) ? role : [role];
  if (user.role !== "ADMIN" && !allowed.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
};

/** Returns the owner userId of a resource, or null when it doesn't exist. */
export async function resourceOwnerId(kind: OwnedResource, id: string): Promise<string | null> {
  switch (kind) {
    case "registry":
      return (await db.registry.findUnique({ where: { id }, select: { userId: true } }))?.userId ?? null;
    case "registryItem":
      return (
        await db.registryItem.findUnique({
          where: { id },
          select: { registry: { select: { userId: true } } },
        })
      )?.registry.userId ?? null;
    case "business":
      return (await db.business.findUnique({ where: { id }, select: { ownerId: true } }))?.ownerId ?? null;
    case "product":
      return (
        await db.product.findUnique({
          where: { id },
          select: { business: { select: { ownerId: true } } },
        })
      )?.business.ownerId ?? null;
    default: {
      const never: never = kind;
      throw new Error(`Unknown resource kind ${String(never)}`);
    }
  }
}

export const requireOwner: RequireOwner = async (kind, id) => {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new AuthError("NOT_FOUND");
  const { id: userId } = await requireUser();
  const user = await loadActiveUser(userId);
  const ownerId = await resourceOwnerId(kind, id);
  if (!ownerId) throw new AuthError("NOT_FOUND");
  if (ownerId !== user.id && user.role !== "ADMIN") throw new AuthError("NOT_FOUND");
  return user;
};
