import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  decryptField,
  encryptField,
  digestCapability,
} from "@/lib/security-crypto";
import { newTotpSecret, verifiedTotpCounter } from "@/lib/totp";
import { parseEntityId } from "@/lib/validators/entity-id";
import { auditOperation } from "./operation-audit";
import { isAdministrator } from "./permissions";

export async function beginMfaEnrollment(
  userId: string,
  deviceId: string | undefined,
) {
  userId = parseEntityId(userId);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, suspendedAt: true, role: true },
    });
    const device = deviceId
      ? await tx.deviceSession.findFirst({
          where: {
            id: deviceId,
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            createdAt: { gte: new Date(Date.now() - 600000) },
          },
        })
      : null;
    if (
      !device ||
      !user ||
      !isAdministrator(user.role) ||
      user.suspendedAt ||
      user.mfaSecret
    )
      throw new Error("MFA_SETUP_UNAVAILABLE");
    const encryptedSecret = encryptField(
        newTotpSecret(),
        `mfa-enroll:${userId}`,
      ),
      expiresAt = new Date(Date.now() + 600000);
    await tx.mfaEnrollment.upsert({
      where: { userId },
      create: { userId, deviceId: device.id, encryptedSecret, expiresAt },
      update: { deviceId: device.id, encryptedSecret, expiresAt },
    });
    await auditOperation(tx, userId, "MFA_ENROLLMENT_STARTED", "USER", userId);
  });
}
export async function pendingMfaSetup(
  userId: string,
  deviceId: string | undefined,
) {
  const pending = await db.mfaEnrollment.findUnique({
    where: { userId: parseEntityId(userId) },
    select: { encryptedSecret: true, expiresAt: true, deviceId: true },
  });
  if (
    !deviceId ||
    !pending ||
    pending.deviceId !== deviceId ||
    pending.expiresAt.getTime() <= Date.now()
  )
    return null;
  return {
    secret: decryptField(pending.encryptedSecret, `mfa-enroll:${userId}`),
    expiresAt: pending.expiresAt,
  };
}
export async function confirmMfaEnrollment(
  userId: string,
  deviceId: string | undefined,
  code: string,
) {
  userId = parseEntityId(userId);
  if (!deviceId) throw new Error("SESSION_UNAVAILABLE");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    const now = new Date();
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, suspendedAt: true, role: true },
    });
    const pending = await tx.mfaEnrollment.findUnique({ where: { userId } });
    const device = await tx.deviceSession.findFirst({
      where: { id: deviceId, userId, revokedAt: null, expiresAt: { gt: now } },
    });
    if (
      !user ||
      !isAdministrator(user.role) ||
      user.suspendedAt ||
      user.mfaSecret ||
      !pending ||
      pending.expiresAt <= now ||
      pending.deviceId !== deviceId ||
      !device
    )
      throw new Error("MFA_SETUP_UNAVAILABLE");
    const secret = decryptField(
        pending.encryptedSecret,
        `mfa-enroll:${userId}`,
      ),
      counter = verifiedTotpCounter(secret, code, now);
    if (counter === null) throw new Error("MFA_CODE_INVALID");
    const recovery = Array.from({ length: 10 }, () =>
      randomBytes(16).toString("hex").toUpperCase(),
    );
    await tx.user.update({
      where: { id: userId },
      data: {
        mfaSecret: encryptField(secret, `mfa:${userId}`),
        mfaLastCounter: counter,
        recoveryHashes: recovery.map((c) => digestCapability(`${userId}:${c}`)),
      },
    });
    await tx.mfaEnrollment.delete({ where: { userId } });
    await tx.deviceSession.update({
      where: { id: deviceId },
      data: {
        mfaVerifiedUntil: new Date(
          Math.min(now.getTime() + 900000, device.expiresAt.getTime()),
        ),
      },
    });
    await auditOperation(
      tx,
      userId,
      "MFA_ENABLED",
      "USER",
      userId,
      "DISABLED",
      "ENABLED",
    );
    return recovery;
  });
}
export async function verifyMfaStepUp(
  userId: string,
  deviceId: string | undefined,
  code: string,
) {
  userId = parseEntityId(userId);
  if (!deviceId || typeof code !== "string" || code.length > 40)
    throw new Error("MFA_CODE_INVALID");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    const now = new Date(),
      user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          mfaSecret: true,
          mfaLastCounter: true,
          recoveryHashes: true,
          suspendedAt: true,
        },
      });
    const device = await tx.deviceSession.findFirst({
      where: { id: deviceId, userId, revokedAt: null, expiresAt: { gt: now } },
    });
    if (!user?.mfaSecret || user.suspendedAt || !device)
      throw new Error("MFA_CODE_INVALID");
    const normalized = code.trim().toUpperCase(),
      recoveryHash = digestCapability(`${userId}:${normalized}`);
    const recovery = user.recoveryHashes.includes(recoveryHash);
    const counter = recovery
      ? null
      : verifiedTotpCounter(
          decryptField(user.mfaSecret, `mfa:${userId}`),
          normalized,
          now,
        );
    if (!recovery && (counter === null || counter <= user.mfaLastCounter))
      throw new Error("MFA_CODE_INVALID");
    await tx.user.update({
      where: { id: userId },
      data: recovery
        ? {
            recoveryHashes: user.recoveryHashes.filter(
              (h) => h !== recoveryHash,
            ),
          }
        : { mfaLastCounter: counter! },
    });
    await tx.deviceSession.update({
      where: { id: device.id },
      data: {
        mfaVerifiedUntil: new Date(
          Math.min(now.getTime() + 900000, device.expiresAt.getTime()),
        ),
      },
    });
    await auditOperation(
      tx,
      userId,
      recovery ? "MFA_RECOVERY_USED" : "MFA_STEP_UP",
      "SESSION",
      deviceId,
    );
  });
}
