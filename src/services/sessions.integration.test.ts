import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { resolveSessionClaims } from "@/lib/session-claims";
import { revokeOwnSessions } from "./sessions";

const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
beforeAll(() => {
  if (run && !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")) throw new Error("Session integration checks require a disposable _test database");
});
afterAll(async () => {
  if (!run) return;
  for (const id of users) await db.user.delete({ where: { id } });
  await db.$disconnect();
});
async function fixture() {
  const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: "Session fixture" } });
  users.push(user.id);
  return user;
}

describe.skipIf(!run)("account-wide session revocation on PostgreSQL", () => {
  it("invalidates copied cookies, removes only the owner's sessions and keeps provider links", async () => {
    const owner = await fixture(); const other = await fixture();
    await db.account.create({ data: { userId: owner.id, type: "oauth", provider: "test-provider", providerAccountId: randomUUID() } });
    await db.session.createMany({ data: [owner, other].map((user) => ({ userId: user.id, sessionToken: randomUUID(), expires: new Date(Date.now() + 3600_000) })) });
    const token = { sub: owner.id, sessionVersion: 0, role: "USER" as const };
    await revokeOwnSessions(owner.id);
    const fresh = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(fresh.sessionVersion).toBe(1);
    expect(resolveSessionClaims(token, fresh)).toBeNull();
    expect(resolveSessionClaims({}, fresh, true)?.sessionVersion).toBe(1);
    expect(await db.session.count({ where: { userId: owner.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: other.id } })).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).sessionVersion).toBe(0);
    expect(await db.account.count({ where: { userId: owner.id } })).toBe(1);
    expect(await db.sessionRevocationEvent.count({ where: { targetId: owner.id, actorId: owner.id } })).toBe(1);
  });
  it("serializes concurrent revocations without losing the audit trail", async () => {
    const owner = await fixture();
    await Promise.all(Array.from({ length: 6 }, () => revokeOwnSessions(owner.id)));
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).sessionVersion).toBe(6);
    expect(await db.sessionRevocationEvent.count({ where: { targetId: owner.id } })).toBe(6);
  });
  it("rolls back the version and session deletion when audit insertion fails", async () => {
    const owner = await fixture();
    await db.session.create({ data: { userId: owner.id, sessionToken: randomUUID(), expires: new Date(Date.now() + 3600_000) } });
    await db.$executeRawUnsafe("CREATE FUNCTION reject_session_audit_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected session audit failure'; END $$");
    await db.$executeRawUnsafe("CREATE TRIGGER reject_session_audit_fixture BEFORE INSERT ON session_revocation_events FOR EACH ROW EXECUTE FUNCTION reject_session_audit_fixture()");
    try {
      await expect(revokeOwnSessions(owner.id)).rejects.toThrow("injected session audit failure");
      expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).sessionVersion).toBe(0);
      expect(await db.session.count({ where: { userId: owner.id } })).toBe(1);
      expect(await db.sessionRevocationEvent.count({ where: { targetId: owner.id } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe("DROP TRIGGER reject_session_audit_fixture ON session_revocation_events");
      await db.$executeRawUnsafe("DROP FUNCTION reject_session_audit_fixture()");
    }
  });
  it("protects history and forbids revocation events attributed to another user", async () => {
    const owner = await fixture(); const other = await fixture();
    await revokeOwnSessions(owner.id);
    const event = await db.sessionRevocationEvent.findFirstOrThrow({ where: { targetId: owner.id } });
    await expect(db.sessionRevocationEvent.update({ where: { id: event.id }, data: { actorId: other.id } })).rejects.toThrow("append-only");
    await expect(db.sessionRevocationEvent.delete({ where: { id: event.id } })).rejects.toThrow("append-only");
    await expect(db.sessionRevocationEvent.create({ data: { actorId: owner.id, targetId: other.id } })).rejects.toThrow();
    await expect(db.user.update({ where: { id: owner.id }, data: { sessionVersion: -1 } })).rejects.toThrow();
  });
  it("does not create audit records for missing accounts", async () => {
    await expect(revokeOwnSessions(randomUUID())).rejects.toThrow("sign in again");
  });
});
