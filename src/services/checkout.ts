import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { stripeProvider } from "@/lib/payments/stripe";
import { checkoutSchema, type CheckoutInput } from "@/lib/validators/checkout";
import { fromMinorUnits, toMinorUnits } from "./money";
import { checkoutConfigured, supportsNativeCheckout } from "./checkout-policy";
import { reserveProductStock, settleProductStock } from "./inventory";

export class CheckoutError extends Error {}

export function stripeCheckoutAvailable() {
  return checkoutConfigured();
}

export async function beginCheckout(data: CheckoutInput, buyerId?: string) {
  const parsed = checkoutSchema.safeParse(data);
  if (!parsed.success) throw new CheckoutError("INVALID_INPUT");
  data = parsed.data;
  if (!stripeCheckoutAvailable()) throw new CheckoutError("PAYMENTS_UNAVAILABLE");
  const requestHash = createHash("sha256").update(JSON.stringify({
    registry: data.registrySlug, locale: data.locale, buyerId: buyerId ?? null,
    buyerName: data.buyerName, buyerEmail: data.buyerEmail, buyerPhone: data.buyerPhone || null,
    giftMessage: data.giftMessage || null, anonymous: data.isAnonymous, currency: "USD",
    items: [...data.registryItemIds].sort().map(id => [id, data.quantities[id]]),
  })).digest("hex");
  const order = await db.$transaction(async (tx) => {
    // Unique constraint is the backstop; this lock lets concurrent retries read
    // the committed attempt instead of reserving stock before losing an insert.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${data.checkoutRequestId}, 0))`;
    const existing = await tx.order.findUnique({ where: { checkoutRequestId: data.checkoutRequestId }, include: { payment: true } });
    if (existing) {
      if (existing.checkoutRequestHash !== requestHash) throw new CheckoutError("CHECKOUT_RETRY_CONFLICT");
      if (existing.status !== "PENDING") throw new CheckoutError(existing.status === "CANCELLED" ? "CHECKOUT_EXPIRED" : "CHECKOUT_COMPLETED");
      return existing;
    }
    // Serialize archive/privacy changes with eligibility and stock reservation.
    await tx.$queryRaw`SELECT id FROM registries WHERE slug = ${data.registrySlug} FOR SHARE`;
    const registry = await tx.registry.findUnique({ where: { slug: data.registrySlug } });
    if (!registry || registry.status !== "PUBLISHED" || !registry.isPublic || registry.password) {
      throw new CheckoutError("REGISTRY_UNAVAILABLE");
    }
    const items = await tx.registryItem.findMany({
      where: { id: { in: data.registryItemIds }, registryId: registry.id },
      orderBy: { id: "asc" },
    });
    if (items.length !== data.registryItemIds.length || items.some((item) => !supportsNativeCheckout(item) || !item.priceUSD)) {
      throw new CheckoutError("ITEM_UNAVAILABLE");
    }
    const catalogItems = items.filter((item) => item.source === "LOCAL_BUSINESS");
    if (catalogItems.length) {
      // Prevent a merchant price/availability edit between authoritative read and reservation.
      const productIds = [...new Set(catalogItems.map(item => item.productId!))].sort();
      await tx.$queryRaw(Prisma.sql`SELECT p.id FROM products p JOIN businesses b ON b.id = p."businessId" WHERE p.id IN (${Prisma.join(productIds)}) ORDER BY p.id COLLATE "C" FOR UPDATE OF p FOR SHARE OF b`);
      const products = await tx.product.findMany({
        where: { id: { in: catalogItems.map((item) => item.productId || "") }, inStock: true, business: { status: "APPROVED" } },
        select: { id: true, businessId: true, priceUSD: true },
      });
      for (const item of catalogItems) {
        const product = products.find((candidate) => candidate.id === item.productId && candidate.businessId === item.businessId);
        if (!product?.priceUSD || toMinorUnits(product.priceUSD) !== toMinorUnits(item.priceUSD!)) throw new CheckoutError("ITEM_UNAVAILABLE");
      }
    }
    try {
      await reserveProductStock(tx, items.map(item => ({ productId: item.productId, quantity: data.quantities[item.id] })));
    } catch (error) {
      if (error instanceof Error && error.message === "ITEM_UNAVAILABLE") throw new CheckoutError("ITEM_UNAVAILABLE");
      throw error;
    }
    let amountMinor = 0;
    for (const item of items) {
      const quantity = data.quantities[item.id];
      // The condition and increment happen under the same PostgreSQL row lock.
      const count = await tx.$executeRaw`
        UPDATE registry_items SET "reservedQty" = "reservedQty" + ${quantity}, "updatedAt" = NOW()
        WHERE id = ${item.id} AND "fulfilledQty" + "reservedQty" + ${quantity} <= quantity
      `;
      if (count !== 1) throw new CheckoutError("ITEM_UNAVAILABLE");
      amountMinor += toMinorUnits(item.priceUSD!) * quantity;
    }
    // Stripe's USD minimum is 50 cents; cap checkout at $9,999.99 for MVP review.
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 50 || amountMinor > 999999) throw new CheckoutError("INVALID_AMOUNT");
    return tx.order.create({
      data: {
        checkoutRequestId: data.checkoutRequestId, checkoutRequestHash: requestHash, checkoutLocale: data.locale,
        orderNumber: `BY-${randomUUID()}`,
        buyerId: buyerId ?? null,
        buyerName: data.buyerName, buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone, giftMessage: data.giftMessage, isAnonymous: data.isAnonymous,
        totalUSD: fromMinorUnits(amountMinor), platformFee: "0.00",
        items: { create: items.map((item) => ({ registryItemId: item.id, productId: item.productId, quantity: data.quantities[item.id], priceUSD: item.priceUSD })) },
        payment: { create: { provider: "STRIPE", currency: "USD", amountUSD: fromMinorUnits(amountMinor) } },
      },
      include: { payment: true },
    });
  }, { maxWait: 15000, timeout: 15000 });
  return continueCheckout(order, data.registrySlug, data.locale);
}

/** The random request ID is a guest retry capability, not a public order ID.
 * Return only a provider destination; never return buyer or order metadata. */
export async function resumeCheckout(input: { checkoutRequestId: string; registrySlug: string }, buyerId?: string) {
  const requestId = checkoutSchema.shape.checkoutRequestId.safeParse(input.checkoutRequestId);
  const slug = checkoutSchema.shape.registrySlug.safeParse(input.registrySlug);
  if (!requestId.success || !slug.success) throw new CheckoutError("INVALID_INPUT");
  if (!stripeCheckoutAvailable()) throw new CheckoutError("PAYMENTS_UNAVAILABLE");
  const order = await db.order.findUnique({ where: { checkoutRequestId: requestId.data }, include: { payment: true, items: { select: { registryItem: { select: { registry: { select: { slug: true } } } } } } } });
  if (!order || !order.items.length || order.items.some(item => item.registryItem.registry.slug !== slug.data) || (order.buyerId && order.buyerId !== buyerId)) throw new CheckoutError("CHECKOUT_NOT_FOUND");
  if (order.status !== "PENDING") throw new CheckoutError(order.status === "CANCELLED" ? "CHECKOUT_EXPIRED" : "CHECKOUT_COMPLETED");
  if (!order.checkoutLocale || !["en", "fr", "ht"].includes(order.checkoutLocale)) throw new CheckoutError("CHECKOUT_PENDING");
  return continueCheckout(order, slug.data, order.checkoutLocale);
}

async function continueCheckout(order: { id: string; orderNumber: string; totalUSD: Prisma.Decimal | null; createdAt: Date; payment: { checkoutUrl: string | null } | null }, registrySlug: string, locale: string) {
  if (order.payment?.checkoutUrl) return { redirectUrl: order.payment.checkoutUrl };
  // Do not open a new late session outside the reconciliation discovery window.
  if (Date.now() - order.createdAt.getTime() > 5 * 60_000) throw new CheckoutError("CHECKOUT_PENDING");
  const baseUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
  try {
    const payment = await stripeProvider.createPayment({
      orderId: order.id, amount: Number(order.totalUSD), currency: "USD",
      // Keep the original provider parameters for pre-rename order retries.
      description: `${order.orderNumber.startsWith("BY-") ? "Bayou" : "KadoLakay"} ${order.orderNumber}`,
      returnUrl: `${baseUrl}/${locale}/r/${encodeURIComponent(registrySlug)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/${locale}/r/${encodeURIComponent(registrySlug)}/checkout?cancelled=true`,
      expiresAt: Math.floor(order.createdAt.getTime() / 1000) + 35 * 60,
    });
    if (!payment.redirectUrl || !payment.providerRef) throw new Error("MISSING_CHECKOUT_URL");
    const destination = new URL(payment.redirectUrl);
    if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com") throw new Error("INVALID_CHECKOUT_URL");
    await db.payment.update({ where: { orderId: order.id }, data: { stripePaymentId: payment.providerRef, checkoutUrl: payment.redirectUrl } });
    return { redirectUrl: payment.redirectUrl };
  } catch {
    // Another identical request may still be creating the session (including
    // provider 409/429 responses). Only provider reconciliation may release it.
    throw new CheckoutError("PAYMENT_START_FAILED");
  }
}

export async function releaseCheckout(orderId: string) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (!claimed.count) return false;
    const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { registryItemId: "asc" } });
    await settleProductStock(tx, items, false);
    for (const item of items) {
      const changed = await tx.$executeRaw`UPDATE registry_items SET "reservedQty" = "reservedQty" - ${item.quantity}, "updatedAt" = NOW() WHERE id = ${item.registryItemId} AND "reservedQty" >= ${item.quantity}`;
      if (changed !== 1) throw new Error('RESERVATION_MISMATCH');
    }
    await tx.payment.update({ where: { orderId }, data: { status: "FAILED" } });
    return true;
  }, { maxWait: 15000, timeout: 15000 });
}
