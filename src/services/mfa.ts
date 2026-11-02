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
/** Wrong codes allowed inside one window before step-up is locked. */
export const MFA_MAX_FAILURES = 10;
export const MFA_FAILURE_WINDOW_MS = 60 * 60 * 1000;
export const MFA_LOCK_MS = 15 * 60 * 1000;

export async function verifyMfaStepUp(
  userId: string,
  deviceId: string | undefined,
  code: string,
) {
  userId = parseEntityId(userId);
  if (!deviceId || typeof code !== "string" || code.length > 40)
    throw new Error("MFA_CODE_INVALID");
  // Failed attempts must be committed, so the transaction reports the outcome and the
  // error is thrown only after it commits. Throwing inside would roll back the count.
  const outcome = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    const now = new Date(),
      user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          mfaSecret: true,
          mfaLastCounter: true,
          recoveryHashes: true,
          suspendedAt: true,
          mfaFailedAttempts: true,
          mfaFailureWindowStart: true,
          mfaLockedUntil: true,
        },
      });
    const device = await tx.deviceSession.findFirst({
      where: { id: deviceId, userId, revokedAt: null, expiresAt: { gt: now } },
    });
    if (!user?.mfaSecret || user.suspendedAt || !device)
      throw new Error("MFA_CODE_INVALID");
    // While locked, codes are not even checked, so guessing gains nothing.
    if (user.mfaLockedUntil && user.mfaLockedUntil > now) return "locked" as const;
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
    if (!recovery && (counter === null || counter <= user.mfaLastCounter)) {
      const windowOpen =
        user.mfaFailureWindowStart &&
        now.getTime() - user.mfaFailureWindowStart.getTime() < MFA_FAILURE_WINDOW_MS;
      const attempts = (windowOpen ? user.mfaFailedAttempts : 0) + 1;
      const lock = attempts >= MFA_MAX_FAILURES;
      await tx.user.update({
        where: { id: userId },
        data: lock
          ? { mfaFailedAttempts: 0, mfaFailureWindowStart: null, mfaLockedUntil: new Date(now.getTime() + MFA_LOCK_MS) }
          : { mfaFailedAttempts: attempts, mfaFailureWindowStart: windowOpen ? user.mfaFailureWindowStart : now },
      });
      if (lock) {
        // Any browser that had passed step-up loses it while the account is locked.
        await tx.deviceSession.updateMany({
          where: { userId, mfaVerifiedUntil: { not: null } },
          data: { mfaVerifiedUntil: null },
        });
        await auditOperation(tx, userId, "MFA_LOCKED", "USER", userId);
      }
      return lock ? ("locked" as const) : ("invalid" as const);
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(recovery
          ? { recoveryHashes: user.recoveryHashes.filter((h) => h !== recoveryHash) }
          : { mfaLastCounter: counter! }),
        mfaFailedAttempts: 0,
        mfaFailureWindowStart: null,
        mfaLockedUntil: null,
      },
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
    return "verified" as const;
  });
  if (outcome === "locked") throw new Error("MFA_LOCKED");
  if (outcome === "invalid") throw new Error("MFA_CODE_INVALID");
}
