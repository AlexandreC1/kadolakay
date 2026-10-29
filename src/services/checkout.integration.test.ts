import { describe, it, expect, vi, afterAll, beforeEach } from "vitest";
const provider = vi.hoisted(() => ({ failNext: false, calls: [] as Array<{ orderId: string; amount: number; expiresAt: number }> }));
vi.mock("@/lib/payments/stripe", () => ({ stripeProvider: { createPayment: async (params: { orderId: string; amount: number; expiresAt: number }) => {
  provider.calls.push(params);
  if (provider.failNext) { provider.failNext = false; throw Object.assign(new Error("Provider request still in progress"), { statusCode: 409 }); }
  return { redirectUrl: "https://checkout.stripe.com/test", providerRef: `cs_test_${params.orderId}` };
} } }));
vi.mock("@/lib/email", () => ({ sendGiftNotification: vi.fn(), sendOrderConfirmation: vi.fn() }));
import { db } from "@/lib/db";
import { beginCheckout, releaseCheckout, resumeCheckout } from "./checkout";
import { fulfillOrder } from "@/lib/orders";
import { randomUUID } from "node:crypto";
import { editOwnedProduct } from "./business";
import { findPublicProduct } from "./catalog";
const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
beforeEach(() => { vi.stubEnv("CHECKOUT_ENABLED", "true"); provider.calls = []; provider.failNext = false; });
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
    const product = await db.product.create({ data: { businessId: business.id, name: "Last gift", priceUSD: "19.99", stockQuantity: 1 } });
    const registry = await db.registry.create({ data: { slug: `test-${randomUUID()}`, userId: user.id, title: "Concurrency test", type: "BABY_SHOWER", status: "PUBLISHED", items: { create: { title: "Last gift", quantity: 1, priceUSD: "19.99", source: "LOCAL_BUSINESS", businessId: business.id, productId: product.id } } }, include: { items: true } });
    const input = { checkoutRequestId: randomUUID(), registrySlug: registry.slug, locale: "en" as const, registryItemIds: [registry.items[0].id], quantities: { [registry.items[0].id]: 1 }, buyerName: "Test", buyerEmail: "test@example.com", isAnonymous: false, paymentProvider: "stripe" as const };
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => beginCheckout({ ...input, checkoutRequestId: randomUUID() })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const orderItem = await db.orderItem.findFirstOrThrow({ where: { registryItemId: registry.items[0].id } });
    const evidence = { sessionId: `cs_test_${orderItem.orderId}`, eventId: `evt_${randomUUID()}`, amountMinor: 1999, currency: "usd" };
    await expect(fulfillOrder(orderItem.orderId, { ...evidence, amountMinor: 1 })).rejects.toThrow("PAYMENT_EVIDENCE_MISMATCH");
    const deliveries = await Promise.all(Array.from({ length: 12 }, () => fulfillOrder(orderItem.orderId, evidence)));
    expect(deliveries.filter(Boolean)).toHaveLength(1);
    const item = await db.registryItem.findUniqueOrThrow({ where: { id: registry.items[0].id } });
    expect(item.fulfilledQty).toBe(1); expect(item.reservedQty).toBe(0);
    expect(await db.product.findUnique({ where: { id: product.id }, select: { stockQuantity: true, reservedStock: true } })).toEqual({ stockQuantity: 0, reservedStock: 0 });
    expect(await releaseCheckout(orderItem.orderId)).toBe(false);
    // A second registry tests abandonment without weakening the paid order.
    const spareProduct = await db.product.create({ data: { businessId: business.id, name: "Spare", priceUSD: "10.00", stockQuantity: 1 } });
    const spare = await db.registryItem.create({ data: { registryId: registry.id, title: "Spare", quantity: 1, priceUSD: "10.00", source: "LOCAL_BUSINESS", businessId: business.id, productId: spareProduct.id } });
    await beginCheckout({ ...input, checkoutRequestId: randomUUID(), registryItemIds: [spare.id], quantities: { [spare.id]: 1 } });
    const hold = await db.orderItem.findFirstOrThrow({ where: { registryItemId: spare.id } });
    const expired = await Promise.all(Array.from({ length: 8 }, () => releaseCheckout(hold.orderId)));
    expect(expired.filter(Boolean)).toHaveLength(1);
    expect((await db.registryItem.findUniqueOrThrow({ where: { id: spare.id } })).reservedQty).toBe(0);
    expect(await db.product.findUnique({ where: { id: spareProduct.id }, select: { stockQuantity: true, reservedStock: true } })).toEqual({ stockQuantity: 1, reservedStock: 0 });
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
    const input = { checkoutRequestId: randomUUID(), registrySlug: registry.slug, locale: "en" as const, registryItemIds: [registry.items[0].id], quantities: { [registry.items[0].id]: 1 }, buyerName: "Test", buyerEmail: "test@example.com", isAnonymous: false, paymentProvider: "stripe" as const };
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

async function stockFixture(stockQuantity: number | null = 1) {
  process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_key";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  const user = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(user.id);
  const business = await db.business.create({ data: { ownerId: user.id, name: "Stock test shop", slug: randomUUID(), category: "Gifts", status: "APPROVED" } });
  const product = await db.product.create({ data: { businessId: business.id, name: "Shared gift", priceUSD: "10.00", stockQuantity } });
  const makeRegistry = () => db.registry.create({ data: { userId: user.id, slug: randomUUID(), title: "Stock test list", type: "BIRTHDAY", status: "PUBLISHED", items: { create: { title: product.name, priceUSD: "10.00", quantity: 3, source: "LOCAL_BUSINESS", productId: product.id, businessId: business.id } } }, include: { items: true } });
  const registry = await makeRegistry();
  const inputFor = (list: typeof registry) => ({ checkoutRequestId: randomUUID(), registrySlug: list.slug, locale: "en" as const, registryItemIds: [list.items[0].id], quantities: { [list.items[0].id]: 1 }, buyerName: "Stock test buyer", buyerEmail: "stock-test@example.com", isAnonymous: false, paymentProvider: "stripe" as const });
  return { user, business, product, registry, makeRegistry, inputFor };
}

describe.skipIf(!run)("physical SKU inventory across registries", () => {
  it("allows only one checkout across two registries for one physical unit and restores it once on expiry", async () => {
    const f = await stockFixture();
    const second = await f.makeRegistry();
    const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => beginCheckout(f.inputFor(i % 2 ? second : f.registry))));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.orderItem.count({ where: { productId: f.product.id } })).toBe(1);
    expect(await db.product.findUnique({ where: { id: f.product.id }, select: { stockQuantity: true, reservedStock: true } })).toEqual({ stockQuantity: 1, reservedStock: 1 });
    const publicProduct = await findPublicProduct(f.product.id);
    expect(publicProduct?.inStock).toBe(false);
    expect(publicProduct).not.toHaveProperty("reservedStock");
    expect(publicProduct).not.toHaveProperty("stockQuantity");
    await expect(editOwnedProduct(f.user.id, f.product.id, { name: f.product.name, priceUSD: 10, inStock: true, stockQuantity: 100 })).rejects.toThrow("active checkout");
    const line = await db.orderItem.findFirstOrThrow({ where: { productId: f.product.id } });
    const releases = await Promise.all(Array.from({ length: 8 }, () => releaseCheckout(line.orderId)));
    expect(releases.filter(Boolean)).toHaveLength(1);
    expect(await db.product.findUnique({ where: { id: f.product.id }, select: { stockQuantity: true, reservedStock: true } })).toEqual({ stockQuantity: 1, reservedStock: 0 });
    await beginCheckout(f.inputFor(second));
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
  }, 30000);

  it("does not infer stock, rejects zero/fractional/negative counts, and allows an owner to confirm or restock", async () => {
    const f = await stockFixture(null);
    await expect(beginCheckout(f.inputFor(f.registry))).rejects.toThrow("ITEM_UNAVAILABLE");
    expect(await db.order.count({ where: { items: { some: { registryItemId: f.registry.items[0].id } } } })).toBe(0);
    const other = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(other.id);
    await expect(editOwnedProduct(other.id, f.product.id, { name: "Tampered", priceUSD: 10, inStock: true, stockQuantity: 100 })).rejects.toThrow();
    await expect(editOwnedProduct(f.user.id, f.product.id, { name: f.product.name, priceUSD: 10, inStock: true, stockQuantity: -1 })).rejects.toThrow();
    await expect(db.product.update({ where: { id: f.product.id }, data: { stockQuantity: -1 } })).rejects.toThrow();
    await expect(db.product.update({ where: { id: f.product.id }, data: { reservedStock: 1 } })).rejects.toThrow();
    await editOwnedProduct(f.user.id, f.product.id, { name: f.product.name, priceUSD: 10, inStock: true, stockQuantity: 0 });
    await expect(beginCheckout(f.inputFor(f.registry))).rejects.toThrow("ITEM_UNAVAILABLE");
    await editOwnedProduct(f.user.id, f.product.id, { name: f.product.name, priceUSD: 10, inStock: true, stockQuantity: 2 });
    await beginCheckout(f.inputFor(f.registry));
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
    await expect(db.product.update({ where: { id: f.product.id }, data: { stockQuantity: 0 } })).rejects.toThrow();
  });

  it("rolls back every hold when a later registry quantity is unavailable", async () => {
    const f = await stockFixture(3);
    // Two registry entries can reference the same SKU in historical/imported data.
    const extra = await db.registryItem.create({ data: { registryId: f.registry.id, title: f.product.name, quantity: 1, fulfilledQty: 1, priceUSD: "10.00", source: "LOCAL_BUSINESS", productId: f.product.id, businessId: f.business.id } });
    const input = f.inputFor(f.registry);
    await expect(beginCheckout({ ...input, registryItemIds: [...input.registryItemIds, extra.id], quantities: { ...input.quantities, [extra.id]: 1 } })).rejects.toThrow("ITEM_UNAVAILABLE");
    expect(await db.product.findUnique({ where: { id: f.product.id }, select: { stockQuantity: true, reservedStock: true } })).toEqual({ stockQuantity: 3, reservedStock: 0 });
    expect((await db.registryItem.findUniqueOrThrow({ where: { id: f.registry.items[0].id } })).reservedQty).toBe(0);
    expect(await db.orderItem.count({ where: { productId: f.product.id } })).toBe(0);
  });

  it("aggregates the same SKU across lines and keeps paid stock consumed when payment races expiry", async () => {
    const f = await stockFixture(2);
    const extra = await db.registryItem.create({ data: { registryId: f.registry.id, title: f.product.name, quantity: 1, priceUSD: "10.00", source: "LOCAL_BUSINESS", productId: f.product.id, businessId: f.business.id } });
    const input = f.inputFor(f.registry);
    await beginCheckout({ ...input, registryItemIds: [...input.registryItemIds, extra.id], quantities: { ...input.quantities, [extra.id]: 1 } });
    const line = await db.orderItem.findFirstOrThrow({ where: { productId: f.product.id } });
    const evidence = { sessionId: `cs_test_${line.orderId}`, eventId: `evt_${randomUUID()}`, amountMinor: 2000, currency: "usd" };
    const results = await Promise.allSettled([fulfillOrder(line.orderId, evidence), releaseCheckout(line.orderId), fulfillOrder(line.orderId, evidence)]);
    expect(results.every(r => r.status === "fulfilled")).toBe(true);
    const order = await db.order.findUniqueOrThrow({ where: { id: line.orderId } });
    const product = await db.product.findUniqueOrThrow({ where: { id: f.product.id } });
    expect(product.reservedStock).toBe(0);
    expect(product.stockQuantity).toBe(order.status === "PAID" ? 0 : 2);
    const items = await db.registryItem.findMany({ where: { registryId: f.registry.id } });
    expect(items.every(i => i.reservedQty === 0)).toBe(true);
    expect(items.reduce((n, i) => n + i.fulfilledQty, 0)).toBe(order.status === "PAID" ? 2 : 0);
    await expect(db.product.delete({ where: { id: f.product.id } })).rejects.toThrow();
  });
});

describe.skipIf(!run)("checkout request retry identity", () => {
  it("reuses one order and one hold for simultaneous and later identical retries", async () => {
    const f = await stockFixture(3);
    const input = f.inputFor(f.registry);
    const results = await Promise.all(Array.from({ length: 10 }, () => beginCheckout(input)));
    expect(results.every(r => r.redirectUrl === "https://checkout.stripe.com/test")).toBe(true);
    expect(await db.order.count({ where: { checkoutRequestId: input.checkoutRequestId } })).toBe(1);
    expect(await db.orderItem.count({ where: { productId: f.product.id } })).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
    const calls = provider.calls.length;
    await beginCheckout(input);
    expect(provider.calls).toHaveLength(calls);
    await expect(beginCheckout({ ...input, quantities: { [f.registry.items[0].id]: 2 } })).rejects.toThrow("CHECKOUT_RETRY_CONFLICT");
    await expect(beginCheckout({ ...input, buyerEmail: "different@example.com" })).rejects.toThrow("CHECKOUT_RETRY_CONFLICT");
    await expect(beginCheckout(input, f.user.id)).rejects.toThrow("CHECKOUT_RETRY_CONFLICT");
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
  }, 30000);

  it("retains ambiguous provider holds and retries with identical Stripe parameters", async () => {
    const f = await stockFixture(3);
    const input = f.inputFor(f.registry);
    provider.failNext = true;
    await expect(beginCheckout(input)).rejects.toThrow("PAYMENT_START_FAILED");
    const order = await db.order.findUniqueOrThrow({ where: { checkoutRequestId: input.checkoutRequestId }, include: { payment: true } });
    expect(order.status).toBe("PENDING"); expect(order.payment?.stripePaymentId).toBeNull();
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
    await beginCheckout(input);
    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[0]).toEqual(provider.calls[1]);
    expect(provider.calls[0].expiresAt).toBe(Math.floor(order.createdAt.getTime() / 1000) + 35 * 60);
    expect(await db.orderItem.count({ where: { productId: f.product.id } })).toBe(1);
    await beginCheckout(input);
    expect(provider.calls).toHaveLength(2);
    await releaseCheckout(order.id);
    await expect(beginCheckout(input)).rejects.toThrow("CHECKOUT_EXPIRED");
    await beginCheckout({ ...input, checkoutRequestId: randomUUID() });
  });

  it("cannot reopen paid attempts or create a late session outside the discovery window", async () => {
    const f = await stockFixture(3);
    const input = f.inputFor(f.registry);
    await beginCheckout(input);
    const order = await db.order.findUniqueOrThrow({ where: { checkoutRequestId: input.checkoutRequestId } });
    await fulfillOrder(order.id, { sessionId: `cs_test_${order.id}`, eventId: `evt_${randomUUID()}`, currency: "usd", amountMinor: 1000 });
    await expect(beginCheckout(input)).rejects.toThrow("CHECKOUT_COMPLETED");
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).stockQuantity).toBe(2);
    const pendingInput = f.inputFor(f.registry);
    provider.failNext = true;
    await expect(beginCheckout(pendingInput)).rejects.toThrow("PAYMENT_START_FAILED");
    await db.order.update({ where: { checkoutRequestId: pendingInput.checkoutRequestId }, data: { createdAt: new Date(Date.now() - 6 * 60_000) } });
    const calls = provider.calls.length;
    await expect(beginCheckout(pendingInput)).rejects.toThrow("CHECKOUT_PENDING");
    expect(provider.calls).toHaveLength(calls);
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
  });
});

describe.skipIf(!run)("resume capability boundaries", () => {
  it("resumes the held last unit without a new selection, order, provider session or stock hold", async () => {
    const f = await stockFixture(1);
    const input = f.inputFor(f.registry);
    await beginCheckout(input);
    const callCount = provider.calls.length;
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).reservedStock).toBe(1);
    await expect(resumeCheckout({ checkoutRequestId: input.checkoutRequestId, registrySlug: f.registry.slug })).resolves.toEqual({ redirectUrl: "https://checkout.stripe.com/test" });
    expect(provider.calls).toHaveLength(callCount);
    expect(await db.orderItem.count({ where: { productId: f.product.id } })).toBe(1);
    await expect(resumeCheckout({ checkoutRequestId: randomUUID(), registrySlug: f.registry.slug })).rejects.toThrow("CHECKOUT_NOT_FOUND");
    await expect(resumeCheckout({ checkoutRequestId: input.checkoutRequestId, registrySlug: "other-list" })).rejects.toThrow("CHECKOUT_NOT_FOUND");
  });
  it("requires the original signed-in buyer and never reopens a processed checkout", async () => {
    const f = await stockFixture(1);
    const input = f.inputFor(f.registry);
    await beginCheckout(input, f.user.id);
    const capability = { checkoutRequestId: input.checkoutRequestId, registrySlug: f.registry.slug };
    await expect(resumeCheckout(capability)).rejects.toThrow("CHECKOUT_NOT_FOUND");
    await expect(resumeCheckout(capability, "other-user")).rejects.toThrow("CHECKOUT_NOT_FOUND");
    await expect(resumeCheckout(capability, f.user.id)).resolves.toEqual({ redirectUrl: "https://checkout.stripe.com/test" });
    const order = await db.order.findUniqueOrThrow({ where: { checkoutRequestId: input.checkoutRequestId } });
    await fulfillOrder(order.id, { sessionId: `cs_test_${order.id}`, eventId: `evt_${randomUUID()}`, currency: "usd", amountMinor: 1000 });
    await expect(resumeCheckout(capability, f.user.id)).rejects.toThrow("CHECKOUT_COMPLETED");
    expect((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).stockQuantity).toBe(0);
  });
});
