import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  beginMfaEnrollment,
  pendingMfaSetup,
  confirmMfaEnrollment,
  verifyMfaStepUp,
} from "./mfa";
import {
  createDeviceSession,
  resolveDeviceSession,
  revokeDeviceSession,
  requireAdminStepUp,
} from "./device-sessions";
import { totpAt } from "@/lib/totp";
const run = process.env.RUN_DB_TESTS === "1",
  users: string[] = [];
beforeAll(() => {
  if (run) {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
      throw new Error("Disposable test DB required");
    vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64"));
  }
});
afterAll(async () => {
  if (!run) return;
  for (const id of users) await db.user.delete({ where: { id } });
  await db.$disconnect();
  vi.unstubAllEnvs();
});
async function fixture() {
  const user = await db.user.create({
    data: { email: `${randomUUID()}@example.invalid`, role: "SUPERADMIN" },
  });
  users.push(user.id);
  return user;
}
describe.skipIf(!run)("device sessions and administrator verification", () => {
  it("revokes only an owned device and immediately rejects suspended accounts", async () => {
    const owner = await fixture(),
      other = await fixture(),
      one = await createDeviceSession(owner.id),
      two = await createDeviceSession(owner.id);
    expect(one).not.toBeNull();
    expect(two).not.toBeNull();
    await expect(revokeDeviceSession(other.id, one!.deviceId)).rejects.toThrow(
      "SESSION_UNAVAILABLE",
    );
    await revokeDeviceSession(owner.id, one!.deviceId);
    expect(await resolveDeviceSession(owner.id, one!.deviceId)).toBeNull();
    expect(await resolveDeviceSession(owner.id, two!.deviceId)).not.toBeNull();
    await db.user.update({
      where: { id: owner.id },
      data: { suspendedAt: new Date() },
    });
    expect(await resolveDeviceSession(owner.id, two!.deviceId)).toBeNull();
    expect(await createDeviceSession(owner.id)).toBeNull();
  });
  it("requires a fresh sign-in for first enrollment and rejects a demotion during setup", async () => {
    const owner = await fixture(),
      device = (await createDeviceSession(owner.id))!;
    await db.deviceSession.update({
      where: { id: device.deviceId },
      data: { createdAt: new Date(Date.now() - 660000) },
    });
    await expect(beginMfaEnrollment(owner.id, device.deviceId)).rejects.toThrow(
      "MFA_SETUP_UNAVAILABLE",
    );
    await db.deviceSession.update({
      where: { id: device.deviceId },
      data: { createdAt: new Date() },
    });
    await beginMfaEnrollment(owner.id, device.deviceId);
    const pending = (await pendingMfaSetup(owner.id, device.deviceId))!;
    await db.user.update({ where: { id: owner.id }, data: { role: "USER" } });
    await expect(
      confirmMfaEnrollment(
        owner.id,
        device.deviceId,
        totpAt(pending.secret, Math.floor(Date.now() / 1000)),
      ),
    ).rejects.toThrow("MFA_SETUP_UNAVAILABLE");
  });
  it("requires actual enrollment, consumes codes once, and binds step-up to a device", async () => {
    const owner = await fixture(),
      one = await createDeviceSession(owner.id),
      two = await createDeviceSession(owner.id);
    await expect(requireAdminStepUp(owner.id, one!.deviceId)).rejects.toThrow(
      "MFA_REQUIRED",
    );
    await beginMfaEnrollment(owner.id, one!.deviceId);
    const pending = await pendingMfaSetup(owner.id, one!.deviceId);
    expect(pending).not.toBeNull();
    expect(await pendingMfaSetup(owner.id, two!.deviceId)).toBeNull();
    const code = totpAt(pending!.secret, Math.floor(Date.now() / 1000));
    await expect(
      confirmMfaEnrollment(owner.id, two!.deviceId, code),
    ).rejects.toThrow("MFA_SETUP_UNAVAILABLE");
    const recovery = await confirmMfaEnrollment(owner.id, one!.deviceId, code);
    expect(recovery).toHaveLength(10);
    const stored = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(stored.mfaSecret).not.toContain(pending!.secret);
    expect(stored.recoveryHashes).not.toContain(recovery[0]);
    await requireAdminStepUp(owner.id, one!.deviceId);
    await expect(requireAdminStepUp(owner.id, two!.deviceId)).rejects.toThrow(
      "MFA_REQUIRED",
    );
    await expect(
      verifyMfaStepUp(owner.id, two!.deviceId, code),
    ).rejects.toThrow("MFA_CODE_INVALID");
    await verifyMfaStepUp(owner.id, two!.deviceId, recovery[0]);
    await requireAdminStepUp(owner.id, two!.deviceId);
    await expect(
      verifyMfaStepUp(owner.id, two!.deviceId, recovery[0]),
    ).rejects.toThrow("MFA_CODE_INVALID");
    expect(await pendingMfaSetup(owner.id, one!.deviceId)).toBeNull();
  });
});
