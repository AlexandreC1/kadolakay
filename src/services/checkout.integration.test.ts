import { describe, it, expect, vi, afterAll, beforeEach } from "vitest";
vi.mock("@/lib/payments/stripe", () => ({ stripeProvider: { createPayment: async (params: { orderId: string }) => ({ redirectUrl: "https://checkout.stripe.com/test", providerRef: `cs_test_${params.orderId}` }) } }));
vi.mock("@/lib/email", () => ({ sendGiftNotification: vi.fn(), sendOrderConfirmation: vi.fn() }));
import { db } from "@/lib/db";
import { beginCheckout, releaseCheckout } from "./checkout";
import { fulfillOrder } from "@/lib/orders";
import { randomUUID } from "node:crypto";
const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
beforeEach(() => { vi.stubEnv("CHECKOUT_ENABLED", "true"); });
afterAll(async () => {
  for (const id of users) {
    const items = await db.registryItem.findMany({ where: { registry: { userId: id } }, select: { id: true } });
    const orders = await db.orderItem.findMany({ where: { registryItemId: { in: items.map((i) => i.id) } }, select: { orderId: true } });
    await db.order.deleteMany({ where: { id: { in: orders.map((o) => o.orderId) } } });
    await db.user.delete({ where: { id } });
  }
  if (run) await db.$disconnect();
  vi.unstubAllEnvs();
});
describe.skipIf(!run)("PostgreSQL inventory and webhook concurrency", () => {
  it("accepts only one buyer for the last item, rejects tampered evidence, fulfills once, and releases expiry once", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_key"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(user.id);
    const business = await db.business.create({ data: { ownerId: user.id, name: "Concurrency test merchant", slug: randomUUID(), category: "Gifts", status: "APPROVED" } });
    const product = await db.product.create({ data: { businessId: business.id, name: "Last gift", priceUSD: "19.99" } });
    const registry = await db.registry.create({ data: { slug: `test-${randomUUID()}`, userId: user.id, title: "Concurrency test", type: "BABY_SHOWER", status: "PUBLISHED", items: { create: { title: "Last gift", quantity: 1, priceUSD: "19.99", source: "LOCAL_BUSINESS", businessId: business.id, productId: product.id } } }, include: { items: true } });
    const input = { registrySlug: registry.slug, locale: "en" as const, registryItemIds: [registry.items[0].id], quantities: { [registry.items[0].id]: 1 }, buyerName: "Test", buyerEmail: "test@example.com", isAnonymous: false, paymentProvider: "stripe" as const };
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => beginCheckout(input)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const orderItem = await db.orderItem.findFirstOrThrow({ where: { registryItemId: registry.items[0].id } });
    const evidence = { sessionId: `cs_test_${orderItem.orderId}`, eventId: `evt_${randomUUID()}`, amountMinor: 1999, currency: "usd" };
    await expect(fulfillOrder(orderItem.orderId, { ...evidence, amountMinor: 1 })).rejects.toThrow("PAYMENT_EVIDENCE_MISMATCH");
    const deliveries = await Promise.all(Array.from({ length: 12 }, () => fulfillOrder(orderItem.orderId, evidence)));
    expect(deliveries.filter(Boolean)).toHaveLength(1);
    const item = await db.registryItem.findUniqueOrThrow({ where: { id: registry.items[0].id } });
    expect(item.fulfilledQty).toBe(1); expect(item.reservedQty).toBe(0);
    expect(await releaseCheckout(orderItem.orderId)).toBe(false);
    // A second registry tests abandonment without weakening the paid order.
    const spareProduct = await db.product.create({ data: { businessId: business.id, name: "Spare", priceUSD: "10.00" } });
    const spare = await db.registryItem.create({ data: { registryId: registry.id, title: "Spare", quantity: 1, priceUSD: "10.00", source: "LOCAL_BUSINESS", businessId: business.id, productId: spareProduct.id } });
    await beginCheckout({ ...input, registryItemIds: [spare.id], quantities: { [spare.id]: 1 } });
    const hold = await db.orderItem.findFirstOrThrow({ where: { registryItemId: spare.id } });
    const expired = await Promise.all(Array.from({ length: 8 }, () => releaseCheckout(hold.orderId)));
    expect(expired.filter(Boolean)).toHaveLength(1);
    expect((await db.registryItem.findUniqueOrThrow({ where: { id: spare.id } })).reservedQty).toBe(0);
    await expect(db.registryItem.update({ where: { id: spare.id }, data: { fulfilledQty: 2 } })).rejects.toThrow();
  }, 30000);
});

describe.skipIf(!run)("catalog checkout eligibility", () => {
  it("rejects suspended vendors, out-of-stock products and changed catalog prices", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_key"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    const business = await db.business.create({ data: { ownerId: owner.id, name: "Test shop", slug: randomUUID(), category: "Gifts", status: "APPROVED" } });
    const product = await db.product.create({ data: { businessId: business.id, name: "Catalog gift", priceUSD: "11.00" } });
    const registry = await db.registry.create({ data: { slug: randomUUID(), title: "Registry", userId: owner.id, type: "BIRTHDAY", status: "PUBLISHED", items: { create: { title: "Catalog gift", source: "LOCAL_BUSINESS", businessId: business.id, productId: product.id, priceUSD: "10.00" } } }, include: { items: true } });
    const input = { registrySlug: registry.slug, locale: "en" as const, registryItemIds: [registry.items[0].id], quantities: { [registry.items[0].id]: 1 }, buyerName: "Test", buyerEmail: "test@example.com", isAnonymous: false, paymentProvider: "stripe" as const };
    await expect(beginCheckout(input)).rejects.toThrow("ITEM_UNAVAILABLE");
    await db.product.update({ where: { id: product.id }, data: { priceUSD: "10.00", inStock: false } });
    await expect(beginCheckout(input)).rejects.toThrow("ITEM_UNAVAILABLE");
    await db.product.update({ where: { id: product.id }, data: { inStock: true } });
    await db.business.update({ where: { id: business.id }, data: { status: "SUSPENDED" } });
    await expect(beginCheckout(input)).rejects.toThrow("ITEM_UNAVAILABLE");
    expect((await db.registryItem.findUniqueOrThrow({ where: { id: registry.items[0].id } })).reservedQty).toBe(0);
    // Product relation does not cascade on business deletion.
    await db.product.delete({ where: { id: product.id } });
    await db.registry.delete({ where: { id: registry.id } });
    await db.business.delete({ where: { id: business.id } });
  });
});
