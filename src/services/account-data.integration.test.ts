import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { resolveSessionClaims } from "@/lib/session-claims";
import { AccountDeletionBlocked, deleteAccount, deletedEmail, exportAccountData } from "./account-data";

const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
const orders: string[] = [];
const businesses: string[] = [];

beforeAll(() => {
  if (run && !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
    throw new Error("Account data checks require a disposable _test database");
});
afterAll(async () => {
  if (!run) return;
  await db.merchantFulfillment.deleteMany({ where: { orderId: { in: orders } } });
  await db.refundRequest.deleteMany({ where: { orderId: { in: orders } } });
  await db.order.deleteMany({ where: { id: { in: orders } } });
  await db.registry.deleteMany({ where: { userId: { in: users } } });
  await db.business.deleteMany({ where: { id: { in: businesses } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

async function person(role: "USER" | "BUSINESS_OWNER" | "ADMIN" = "USER") {
  const email = `${randomUUID()}@example.invalid`;
  const user = await db.user.create({ data: { email, name: "Fixture Person", phone: "+50900000000", role } });
  users.push(user.id);
  return user;
}
async function list(userId: string, items: number) {
  return db.registry.create({
    data: {
      slug: `fixture-${randomUUID()}`,
      userId,
      type: "BIRTHDAY",
      title: "Private birthday list",
      description: "Personal note",
      recipientName: "Recipient",
      status: "PUBLISHED",
      items: { create: Array.from({ length: items }, (_, i) => ({ title: `Item ${i}`, description: "detail", priceUSD: 10 })) },
    },
    include: { items: true },
  });
}
async function order(buyerId: string | null, registryItemId: string, status: "PENDING" | "PAID" | "DELIVERED" = "DELIVERED") {
  const created = await db.order.create({
    data: {
      orderNumber: `TEST-${randomUUID()}`,
      buyerId,
      buyerName: "Buyer Name",
      buyerEmail: "buyer@example.invalid",
      buyerPhone: "+50911111111",
      giftMessage: "Congratulations",
      status,
      totalUSD: 10,
      items: { create: { registryItemId, quantity: 1, priceUSD: 10 } },
    },
  });
  orders.push(created.id);
  return created;
}

describe.skipIf(!run)("account export and deletion on PostgreSQL", () => {
  it("exports the person's own data without secrets", async () => {
    const owner = await person();
    await db.user.update({ where: { id: owner.id }, data: { mfaSecret: "enc1.secret" } });
    await db.account.create({ data: { userId: owner.id, type: "oauth", provider: "google", providerAccountId: randomUUID(), access_token: "token-value" } });
    const own = await list(owner.id, 1);
    await db.registry.update({ where: { id: own.id }, data: { password: "scrypt1:x:y" } });
    const giftList = await list((await person()).id, 1);
    await order(owner.id, giftList.items[0].id, "PENDING");

    const data = await exportAccountData(owner.id);
    const text = JSON.stringify(data);
    expect(data.profile.email).toBe(owner.email);
    expect(data.profile.authenticatorEnabled).toBe(true);
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].passwordProtected).toBe(true);
    expect(data.purchases).toHaveLength(1);
    expect(data.profile.accounts).toEqual([{ provider: "google", type: "oauth" }]);
    for (const secret of ["token-value", "enc1.secret", "scrypt1:x:y", "mfaSecret", "recoveryHashes"])
      expect(text).not.toContain(secret);
  });

  it("removes personal data, keeps gift records and blocks future sign-in", async () => {
    const owner = await person();
    const friend = await person();
    await db.account.create({ data: { userId: owner.id, type: "oauth", provider: "google", providerAccountId: randomUUID() } });
    await db.deviceSession.create({ data: { userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) } });
    const untouched = await list(owner.id, 2);
    const gifted = await list(owner.id, 2);
    const received = await order(friend.id, gifted.items[0].id);
    const friendsList = await list(friend.id, 1);
    const purchase = await order(owner.id, friendsList.items[0].id);

    await deleteAccount(owner.id, ` ${owner.email.toUpperCase()} `);

    const tomb = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(tomb).toMatchObject({ email: deletedEmail(owner.id), name: null, phone: null, image: null, sessionVersion: 1 });
    expect(tomb.suspendedAt).not.toBeNull();
    expect(resolveSessionClaims({ sub: owner.id, sessionVersion: 0 }, tomb)).toBeNull();
    expect(await db.account.count({ where: { userId: owner.id } })).toBe(0);
    expect(await db.deviceSession.count({ where: { userId: owner.id } })).toBe(0);

    expect(await db.registry.findUnique({ where: { id: untouched.id } })).toBeNull();
    const archived = await db.registry.findUniqueOrThrow({ where: { id: gifted.id }, include: { items: true } });
    expect(archived).toMatchObject({ status: "ARCHIVED", visibility: "PRIVATE", isPublic: false, description: null, recipientName: null });
    expect(archived.title).not.toContain("birthday");
    expect(archived.items.map((i) => i.id)).toEqual([gifted.items[0].id]);
    expect(await db.order.findUnique({ where: { id: received.id } })).not.toBeNull();

    const scrubbed = await db.order.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(scrubbed).toMatchObject({ buyerId: null, buyerPhone: null, giftMessage: null, isAnonymous: true, buyerEmail: deletedEmail(purchase.id) });
    expect(Number(scrubbed.totalUSD)).toBe(10);

    expect(await db.operationAuditEvent.count({ where: { targetId: owner.id, action: "ACCOUNT_DELETED" } })).toBe(1);
    await expect(deleteAccount(owner.id, deletedEmail(owner.id))).rejects.toThrow("ACCOUNT_UNAVAILABLE");
  });

  it("changes nothing when the confirmation does not match", async () => {
    const owner = await person();
    await expect(deleteAccount(owner.id, "someone-else@example.invalid")).rejects.toThrow("CONFIRMATION_MISMATCH");
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).email).toBe(owner.email);
  });

  it("refuses administrators, active purchases and merchants with order history", async () => {
    const admin = await person("ADMIN");
    await expect(deleteAccount(admin.id, admin.email)).rejects.toEqual(new AccountDeletionBlocked("ADMIN_ACCOUNT"));

    const buyer = await person();
    const merchantOwner = await person("BUSINESS_OWNER");
    const business = await db.business.create({ data: { ownerId: merchantOwner.id, name: "Fixture Shop", slug: `shop-${randomUUID()}`, category: "gifts" } });
    businesses.push(business.id);
    const shelf = await list((await person()).id, 1);
    await db.registryItem.update({ where: { id: shelf.items[0].id }, data: { businessId: business.id } });
    const active = await order(buyer.id, shelf.items[0].id, "PAID");
    await db.merchantFulfillment.create({ data: { orderId: active.id, businessId: business.id, state: "PREPARING" } });

    await expect(deleteAccount(buyer.id, buyer.email)).rejects.toEqual(new AccountDeletionBlocked("ACTIVE_ORDERS"));
    await expect(deleteAccount(merchantOwner.id, merchantOwner.email)).rejects.toEqual(new AccountDeletionBlocked("MERCHANT_RECORDS"));
    expect((await db.user.findUniqueOrThrow({ where: { id: buyer.id } })).email).toBe(buyer.email);
    expect(await db.business.count({ where: { id: business.id } })).toBe(1);
  });

  it("deletes a merchant's business when it has no order history", async () => {
    const owner = await person("BUSINESS_OWNER");
    const business = await db.business.create({
      data: { ownerId: owner.id, name: "Quiet Shop", slug: `shop-${randomUUID()}`, category: "gifts", products: { create: { name: "Basket", priceUSD: 5 } } },
    });
    await deleteAccount(owner.id, owner.email);
    expect(await db.business.count({ where: { id: business.id } })).toBe(0);
    expect(await db.product.count({ where: { businessId: business.id } })).toBe(0);
  });

  it("deletes the person's photos from storage only when nothing else still uses them", async () => {
    vi.stubEnv("S3_PUBLIC_URL", "https://cdn.example.invalid");
    try {
      const photo = (ctx: string, n: number) =>
        `https://cdn.example.invalid/uploads/${ctx}/clfixture${n}/1793627682000-${String(n).padStart(24, "0")}.webp`;
      const owner = await person("BUSINESS_OWNER");
      await db.user.update({ where: { id: owner.id }, data: { image: "https://lh3.googleusercontent.com/a/profile" } });
      const ownList = await db.registry.create({
        data: {
          slug: `fixture-${randomUUID()}`, userId: owner.id, type: "BIRTHDAY", title: "Photos", coverImage: photo("registry", 1),
          items: { create: [{ title: "Lamp", imageUrl: photo("registry", 2) }] },
        },
      });
      const shopPhoto = photo("product", 3);
      const business = await db.business.create({
        data: { ownerId: owner.id, name: "Photo Shop", slug: `shop-${randomUUID()}`, category: "gifts", logoUrl: photo("business", 4), products: { create: { name: "Vase", imageUrl: shopPhoto } } },
      });
      businesses.push(business.id);
      // Someone else's list copied the product photo, so it must survive.
      const friend = await person();
      await db.registry.create({
        data: { slug: `fixture-${randomUUID()}`, userId: friend.id, type: "WEDDING", title: "Friend list", items: { create: [{ title: "Vase", imageUrl: shopPhoto }] } },
      });
      const removed: string[] = [];
      await deleteAccount(owner.id, owner.email, { removeUpload: async (key) => void removed.push(key) });
      expect(await db.registry.findUnique({ where: { id: ownList.id } })).toBeNull();
      expect(removed.sort()).toEqual(
        [photo("registry", 1), photo("registry", 2), photo("business", 4)].map((u) => u.replace("https://cdn.example.invalid/", "")).sort(),
      );
      expect(removed.some((k) => k.includes("clfixture3"))).toBe(false);
      expect(removed.some((k) => k.includes("googleusercontent"))).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("never fails a committed deletion when storage cleanup fails", async () => {
    vi.stubEnv("S3_PUBLIC_URL", "https://cdn.example.invalid");
    try {
      const owner = await person();
      await db.registry.create({
        data: { slug: `fixture-${randomUUID()}`, userId: owner.id, type: "BIRTHDAY", title: "x", coverImage: "https://cdn.example.invalid/uploads/registry/clfail/1793627682000-0123456789abcdef01234567.png" },
      });
      await deleteAccount(owner.id, owner.email, { removeUpload: async () => { throw new Error("storage down"); } });
      expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).email).toBe(deletedEmail(owner.id));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
