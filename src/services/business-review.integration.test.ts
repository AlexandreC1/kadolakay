import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { reviewBusiness } from "./business-review";
import { editOwnedProduct } from "./business";
const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
afterAll(async () => { if (!run) return; for (const id of users) await db.user.delete({ where: { id } }); await db.$disconnect(); });
async function fixture() {
  const admin = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, role: "ADMIN" } }); users.push(admin.id);
  const owner = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, role: "BUSINESS_OWNER" } }); users.push(owner.id);
  const business = await db.business.create({ data: { name: "Security test business", slug: randomUUID(), category: "home", ownerId: owner.id } });
  return { admin, owner, business };
}
describe.skipIf(!run)("privileged review and audit on PostgreSQL", () => {
  it("denies owners and demoted administrators without status changes or audit writes", async () => {
    const f = await fixture();
    await expect(reviewBusiness(f.owner.id, { businessId: f.business.id, status: "APPROVED" })).rejects.toThrow("Forbidden");
    let attempted: Promise<boolean> | undefined;
    await db.$transaction(async tx => {
      await tx.user.update({ where: { id: f.admin.id }, data: { role: "USER" } });
      attempted = reviewBusiness(f.admin.id, { businessId: f.business.id, status: "APPROVED" }).then(() => true, () => false);
    });
    expect(await attempted).toBe(false);
    expect((await db.business.findUniqueOrThrow({ where: { id: f.business.id } })).status).toBe("PENDING_REVIEW");
    expect(await db.securityAuditEvent.count({ where: { targetId: f.business.id } })).toBe(0);
  });
  it("records one transition under duplicate requests and prevents altering or deleting its evidence", async () => {
    const f = await fixture();
    const result = await Promise.all(Array.from({ length: 8 }, () => reviewBusiness(f.admin.id, { businessId: f.business.id, status: "APPROVED" })));
    expect(result.filter(r => r.changed)).toHaveLength(1);
    const events = await db.securityAuditEvent.findMany({ where: { targetId: f.business.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ actorId: f.admin.id, action: "BUSINESS_STATUS_CHANGED", previousStatus: "PENDING_REVIEW", nextStatus: "APPROVED" });
    await expect(db.securityAuditEvent.update({ where: { id: events[0].id }, data: { actorId: f.owner.id } })).rejects.toThrow("append-only");
    await expect(db.securityAuditEvent.delete({ where: { id: events[0].id } })).rejects.toThrow("append-only");
    await reviewBusiness(f.admin.id, { businessId: f.business.id, status: "SUSPENDED" });
    expect(await db.securityAuditEvent.count({ where: { targetId: f.business.id } })).toBe(2);
    expect((await db.business.findUniqueOrThrow({ where: { id: f.business.id } })).status).toBe("SUSPENDED");
  }, 30000);
  it("rejects injected role fields and checks product authority again inside the transaction", async () => {
    const f = await fixture();
    await expect(reviewBusiness(f.admin.id, { businessId: f.business.id, status: "APPROVED", role: "ADMIN" })).rejects.toThrow();
    const product = await db.product.create({ data: { businessId: f.business.id, name: "Security test gift", priceUSD: 10, stockQuantity: 2 } });
    await db.user.update({ where: { id: f.owner.id }, data: { role: "USER" } });
    await expect(editOwnedProduct(f.owner.id, product.id, { name: "Changed", priceUSD: 10, stockQuantity: 2, inStock: true })).rejects.toThrow("Forbidden");
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).name).toBe("Security test gift");
  });
});
