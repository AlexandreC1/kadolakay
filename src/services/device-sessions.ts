import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { auditOperation } from "./operation-audit";
const accountSelect = {
  id: true,
  role: true,
  name: true,
  sessionVersion: true,
  suspendedAt: true,
} as const;
export async function createDeviceSession(userId: string) {
  userId = parseEntityId(userId);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: accountSelect,
    });
    if (!user || user.suspendedAt) return null;
    const now = new Date();
    await tx.deviceSession.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }],
      },
    });
    const oldest = await tx.deviceSession.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 19,
      take: 100,
      select: { id: true },
    });
    if (oldest.length)
      await tx.deviceSession.deleteMany({
        where: { id: { in: oldest.map((d) => d.id) } },
      });
    const device = await tx.deviceSession.create({
      data: { userId, expiresAt: new Date(now.getTime() + 86400000) },
    });
    return { user, deviceId: device.id };
  });
}
export async function resolveDeviceSession(userId: string, deviceId: unknown) {
  if (typeof deviceId !== "string" || deviceId.length > 100) return null;
  const device = await db.deviceSession.findFirst({
    where: {
      id: deviceId,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { suspendedAt: null },
    },
    select: { id: true, user: { select: accountSelect } },
  });
  return device ? { user: device.user, deviceId: device.id } : null;
}
export async function revokeDeviceSession(actorId: string, deviceId: string) {
  actorId = parseEntityId(actorId);
  deviceId = parseEntityId(deviceId);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actorId} FOR UPDATE`;
    const changed = await tx.deviceSession.updateMany({
      where: { id: deviceId, userId: actorId, revokedAt: null },
      data: { revokedAt: new Date(), mfaVerifiedUntil: null },
    });
    if (!changed.count) throw new Error("SESSION_UNAVAILABLE");
    await auditOperation(
      tx,
      actorId,
      "SESSION_REVOKED",
      "SESSION",
      deviceId,
      "ACTIVE",
      "REVOKED",
    );
  });
}
export async function requireAdminStepUp(userId: string, deviceId: unknown) {
  if (typeof deviceId !== "string") throw new Error("MFA_REQUIRED");
  const now = new Date();
  const session = await db.deviceSession.findFirst({
    where: {
      id: deviceId,
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
      mfaVerifiedUntil: { gt: now },
      user: { suspendedAt: null, mfaSecret: { not: null } },
    },
    select: { id: true },
  });
  if (!session) throw new Error("MFA_REQUIRED");
}
