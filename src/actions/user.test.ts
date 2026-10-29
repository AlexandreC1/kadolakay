import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tx = {
    order: { updateMany: vi.fn() },
    registry: { findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    business: { update: vi.fn() },
    product: { updateMany: vi.fn() },
    account: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    verificationToken: { deleteMany: vi.fn() },
    user: { update: vi.fn() },
    auditLog: { create: vi.fn() },
    emailOutbox: { create: vi.fn() },
  };
  return {
    tx,
    calls: [] as string[],
    auth: vi.fn(),
    signOut: vi.fn(),
    revoke: vi.fn(),
    enqueueEmail: vi.fn(),
    enqueueEmailWith: vi.fn(),
    rate: vi.fn(),
    db: {
      user: { findUnique: vi.fn(), update: vi.fn() },
      order: { count: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});
vi.mock("@/lib/auth", () => ({ auth: m.auth, signOut: m.signOut, revokeUserSessions: m.revoke }));
vi.mock("@/lib/db", () => ({ db: m.db }));
vi.mock("@/lib/email/outbox", () => ({ enqueueEmail: m.enqueueEmail, enqueueEmailWith: m.enqueueEmailWith }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: m.rate, getClientIp: () => "1.2.3.4" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { deleteAccount, signOutEverywhere, submitContact } from "./user";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  m.calls = [];
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  m.db.user.findUnique.mockResolvedValue({ id: "u1", email: "Ana@Example.com", name: "Ana", deletedAt: null, business: null });
  m.tx.registry.findMany.mockResolvedValue([
    { id: "r-empty", _count: { orders: 0 } },
    { id: "r-orders", _count: { orders: 2 } },
  ]);
  m.enqueueEmailWith.mockImplementation(async () => m.calls.push("email"));
  m.tx.user.update.mockImplementation(async () => m.calls.push("anonymise"));
  m.rate.mockResolvedValue({ ok: true });
});

describe("deleteAccount", () => {
  it("requires the exact email (case-insensitive) as confirmation", async () => {
    expect(await deleteAccount(fd({ confirmEmail: "someone@else.com" }))).toEqual({ ok: false, error: "CONFIRMATION" });
    expect(m.db.$transaction).not.toHaveBeenCalled();
  });

  it("anonymises PII, keeps orders, archives/deletes registries, queues email first, signs out", async () => {
    await deleteAccount(fd({ confirmEmail: "ana@example.com" }));
    expect(m.calls).toEqual(["email", "anonymise"]);
    expect(m.enqueueEmailWith.mock.calls[0][1]).toMatchObject({ template: "account-deleted", to: "Ana@Example.com", dedupeKey: "user:u1:account-deleted" });
    expect(m.tx.order.updateMany).toHaveBeenCalledWith({
      where: { buyerId: "u1" },
      data: { buyerId: null, buyerName: "Deleted user", buyerEmail: "deleted+u1@invalid", buyerPhone: null },
    });
    expect(m.tx.registry.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["r-empty"] } } });
    expect(m.tx.registry.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: { in: ["r-orders"] } }, data: { status: "ARCHIVED", isPublic: false } });
    const userData = m.tx.user.update.mock.calls[0][0].data;
    expect(userData).toMatchObject({ name: null, email: "deleted+u1@invalid", phone: null, image: null, tokenVersion: { increment: 1 } });
    expect(userData.deletedAt).toBeInstanceOf(Date);
    expect(m.tx.account.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(m.tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(m.tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "user.delete_account", targetId: "u1" });
    expect(m.signOut).toHaveBeenCalled();
  });

  it("is blocked while the user's business has unsettled orders", async () => {
    m.db.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.c", name: null, deletedAt: null, business: { id: "b1" } });
    m.db.order.count.mockResolvedValue(1);
    expect(await deleteAccount(fd({ confirmEmail: "a@b.c" }))).toEqual({ ok: false, error: "UNSETTLED_BUSINESS_ORDERS" });
    expect(m.db.$transaction).not.toHaveBeenCalled();
  });

  it("suspends the business and soft-deletes its products when settled", async () => {
    m.db.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.c", name: null, deletedAt: null, business: { id: "b1" } });
    m.db.order.count.mockResolvedValue(0);
    await deleteAccount(fd({ confirmEmail: "a@b.c" }));
    expect(m.tx.business.update.mock.calls[0][0]).toMatchObject({ where: { id: "b1" }, data: { status: "SUSPENDED", phone: null } });
    expect(m.tx.product.updateMany).toHaveBeenCalled();
  });

  it("rejects anonymous callers and already-deleted users", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expect(deleteAccount(fd({ confirmEmail: "x" }))).rejects.toThrow("Unauthorized");
    m.db.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "a@b.c", deletedAt: new Date(), business: null });
    await expect(deleteAccount(fd({ confirmEmail: "a@b.c" }))).rejects.toThrow("Unauthorized");
  });
});

describe("signOutEverywhere", () => {
  it("bumps tokenVersion, audits, signs out", async () => {
    await signOutEverywhere();
    expect(m.revoke).toHaveBeenCalledWith("u1");
    expect(m.db.auditLog.create).toHaveBeenCalled();
    expect(m.signOut).toHaveBeenCalled();
  });
});

describe("submitContact", () => {
  const ok = { name: "Ana", email: "ana@example.com", message: "Hello there, a question." };
  it("queues a contact email to support with a content dedupe key", async () => {
    expect(await submitContact(fd(ok))).toEqual({ ok: true });
    expect(m.enqueueEmail.mock.calls[0][0]).toMatchObject({ template: "contact-form", payload: { fromEmail: "ana@example.com" } });
    expect(m.enqueueEmail.mock.calls[0][0].dedupeKey).toMatch(/^contact:[0-9a-f]{32}:contact-form$/);
  });
  it("honeypot: pretends success, sends nothing", async () => {
    expect(await submitContact(fd({ ...ok, website: "spam.example" }))).toEqual({ ok: true });
    expect(m.enqueueEmail).not.toHaveBeenCalled();
  });
  it("validates and rate-limits", async () => {
    expect(await submitContact(fd({ ...ok, message: "short" }))).toEqual({ ok: false, error: "INVALID" });
    m.rate.mockResolvedValueOnce({ ok: false });
    expect(await submitContact(fd(ok))).toEqual({ ok: false, error: "RATE_LIMITED" });
    expect(m.enqueueEmail).not.toHaveBeenCalled();
  });
});
