import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { stripeProvider } from "@/lib/payments/stripe";
import { type CheckoutInput } from "@/lib/validators/checkout";
import { fromMinorUnits, toMinorUnits } from "./money";
import { checkoutConfigured, supportsNativeCheckout } from "./checkout-policy";

export class CheckoutError extends Error {}

export function stripeCheckoutAvailable() {
  return checkoutConfigured();
}

export async function beginCheckout(data: CheckoutInput, buyerId?: string) {
  if (!stripeCheckoutAvailable()) throw new CheckoutError("PAYMENTS_UNAVAILABLE");
  const order = await db.$transaction(async (tx) => {
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
      await tx.$queryRaw(Prisma.sql`SELECT p.id FROM products p JOIN businesses b ON b.id = p."businessId" WHERE p.id IN (${Prisma.join(productIds)}) ORDER BY p.id FOR SHARE OF p, b`);
      const products = await tx.product.findMany({
        where: { id: { in: catalogItems.map((item) => item.productId || "") }, inStock: true, business: { status: "APPROVED" } },
        select: { id: true, businessId: true, priceUSD: true },
      });
      for (const item of catalogItems) {
        const product = products.find((candidate) => candidate.id === item.productId && candidate.businessId === item.businessId);
        if (!product?.priceUSD || toMinorUnits(product.priceUSD) !== toMinorUnits(item.priceUSD!)) throw new CheckoutError("ITEM_UNAVAILABLE");
      }
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
        orderNumber: `KL-${randomUUID()}`,
        buyerId: buyerId ?? null,
        buyerName: data.buyerName, buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone, giftMessage: data.giftMessage, isAnonymous: data.isAnonymous,
        totalUSD: fromMinorUnits(amountMinor), platformFee: "0.00",
        items: { create: items.map((item) => ({ registryItemId: item.id, quantity: data.quantities[item.id], priceUSD: item.priceUSD })) },
        payment: { create: { provider: "STRIPE", currency: "USD", amountUSD: fromMinorUnits(amountMinor) } },
      },
    });
  }, { maxWait: 15000, timeout: 15000 });
  const baseUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
  try {
    const payment = await stripeProvider.createPayment({
      orderId: order.id, amount: Number(order.totalUSD), currency: "USD",
      description: `KadoLakay ${order.orderNumber}`,
      returnUrl: `${baseUrl}/${data.locale}/r/${encodeURIComponent(data.registrySlug)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/${data.locale}/r/${encodeURIComponent(data.registrySlug)}/checkout?cancelled=true`,
    });
    if (!payment.redirectUrl || !payment.providerRef) throw new Error("MISSING_CHECKOUT_URL");
    await db.payment.update({ where: { orderId: order.id }, data: { stripePaymentId: payment.providerRef } });
    return { redirectUrl: payment.redirectUrl };
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 0;
    if (status >= 400 && status < 500) await releaseCheckout(order.id);
    // If the provider request times out, a session may already exist. Retain the
    // hold for reconciliation instead of freeing stock for a second charge.
    throw new CheckoutError("PAYMENT_START_FAILED");
  }
}

export async function releaseCheckout(orderId: string) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (!claimed.count) return false;
    const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { registryItemId: "asc" } });
    for (const item of items) {
      const changed = await tx.$executeRaw`UPDATE registry_items SET "reservedQty" = "reservedQty" - ${item.quantity}, "updatedAt" = NOW() WHERE id = ${item.registryItemId} AND "reservedQty" >= ${item.quantity}`;
      if (changed !== 1) throw new Error('RESERVATION_MISMATCH');
    }
    await tx.payment.update({ where: { orderId }, data: { status: "FAILED" } });
    return true;
  }, { maxWait: 15000, timeout: 15000 });
}
