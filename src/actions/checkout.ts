"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators/checkout";
import { getPaymentProvider, isProviderEnabled, PROVIDER_CURRENCY, providerEnum, type PaymentProviderType } from "@/lib/payments";
import { priceOrder } from "@/lib/payments/pricing";
import { generateOrderNumber } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionError } from "@/lib/contracts/action";
import { ProviderError } from "@/lib/contracts/payments";
import { log } from "@/lib/log";

const ORDER_TTL_MS = 2 * 60 * 60 * 1000;

// User-facing messages. Never include internals.
const MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Some items can't be purchased with this payment method or quantity.",
  NOT_FOUND: "Some items are no longer available.",
  CONFLICT: "Some items have already been fully gifted.",
  PROVIDER_ERROR: "The payment provider is unavailable. Please try again or choose another method.",
};

function clientIp(h: Headers): string {
  // Trust the platform-set header first (Vercel); X-Forwarded-For's first hop is client-controlled.
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "anon"
  );
}

export async function createOrder(formData: FormData) {
  const session = await auth();
  const h = await headers();
  const identifier = session?.user?.id ? `user:${session.user.id}` : `ip:${clientIp(h)}`;
  const rl = await checkRateLimit("checkout", identifier);
  if (!rl.ok) throw new Error("Too many checkout attempts. Please wait a moment and try again.");

  let registryItemIds: unknown;
  let quantities: unknown;
  try {
    registryItemIds = JSON.parse(formData.get("registryItemIds") as string);
    quantities = JSON.parse(formData.get("quantities") as string);
  } catch {
    throw new Error("Invalid order data");
  }

  const parsed = checkoutSchema.safeParse({
    registryItemIds,
    quantities,
    buyerName: formData.get("buyerName") as string,
    buyerEmail: formData.get("buyerEmail") as string,
    buyerPhone: (formData.get("buyerPhone") as string) || undefined,
    giftMessage: (formData.get("giftMessage") as string) || undefined,
    isAnonymous: formData.get("isAnonymous") === "true",
    paymentProvider: formData.get("paymentProvider") as string,
  });
  if (!parsed.success) throw new Error("Invalid order data");
  const data = parsed.data;
  const providerKey = data.paymentProvider as PaymentProviderType;
  if (!isProviderEnabled(providerKey)) throw new Error("This payment method is not available right now.");
  const currency = PROVIDER_CURRENCY[providerKey];

  const rows = await db.registryItem.findMany({
    where: { id: { in: data.registryItemIds } },
    select: {
      id: true, registryId: true, priceHTG: true, priceUSD: true, quantity: true, fulfilledQty: true, status: true,
      registry: { select: { id: true, slug: true, status: true } },
    },
  });

  let priced;
  try {
    priced = priceOrder({ requestedIds: data.registryItemIds, quantities: data.quantities, currency, rows });
  } catch (err) {
    if (err instanceof ActionError) throw new Error(MESSAGES[err.code] ?? "Invalid order");
    throw err;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const totalHTG = currency === "HTG" ? priced.total : null;
  const totalUSD = currency === "USD" ? priced.total : null;

  // Order + Payment in one transaction so there is never an order without a payment row (H6).
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        registryId: priced.registryId,
        buyerId: session?.user?.id || null,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone,
        giftMessage: data.giftMessage,
        isAnonymous: data.isAnonymous,
        totalHTG,
        totalUSD,
        platformFee: priced.platformFee,
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
        items: {
          create: priced.lines.map((l) => ({
            registryItemId: l.registryItemId,
            quantity: l.quantity,
            priceHTG: l.priceHTG,
            priceUSD: l.priceUSD,
          })),
        },
      },
      select: { id: true, orderNumber: true, publicToken: true },
    });
    await tx.payment.create({
      data: {
        orderId: created.id,
        provider: providerEnum(providerKey),
        currency,
        amountHTG: totalHTG,
        amountUSD: totalUSD,
        amountExpected: priced.total,
      },
    });
    return created;
  });

  const successUrl = `${baseUrl}/r/${priced.registrySlug}/checkout/success?t=${order.publicToken}`;
  const cancelUrl = `${baseUrl}/r/${priced.registrySlug}?status=cancelled`;
  // PayPal must return to our capture handler; MonCash's return URL is set in its merchant portal.
  const returnUrl = providerKey === "paypal" ? `${baseUrl}/api/webhooks/paypal` : successUrl;

  let result;
  try {
    result = await getPaymentProvider(providerKey).create({
      orderId: order.id,
      publicToken: order.publicToken,
      amount: priced.total,
      currency,
      description: `KadoLakay - ${order.orderNumber}`,
      returnUrl,
      cancelUrl,
    });
  } catch (err) {
    log.error("checkout: provider create failed", { orderId: order.id, provider: providerKey, err });
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } }),
      db.payment.update({ where: { orderId: order.id }, data: { status: "FAILED" } }),
    ]);
    throw new Error(err instanceof ProviderError ? MESSAGES.PROVIDER_ERROR : "Something went wrong");
  }

  await db.payment.update({
    where: { orderId: order.id },
    data: {
      stripePaymentId: providerKey === "stripe" ? result.providerRef : null,
      paypalOrderId: providerKey === "paypal" ? result.providerRef : null,
      // MonCash token; the settled transaction id is stored as providerTxId on verify.
      moncashTxId: providerKey === "moncash" ? result.providerRef : null,
      natcashTxId: providerKey === "natcash" ? result.providerRef : null,
    },
  });

  return { orderId: order.id, orderNumber: order.orderNumber, redirectUrl: result.redirectUrl };
}

/**
 * Registry OWNER marks an external (Amazon / other shop) item as received
 * (review C1: this used to be callable by anyone for any item).
 */
export async function confirmExternalPurchase(registryItemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (typeof registryItemId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(registryItemId)) throw new Error("Not found");

  const rl = await checkRateLimit("general", `user:${session.user.id}:confirm-external`);
  if (!rl.ok) throw new Error("Too many requests");

  const item = await db.registryItem.findUnique({
    where: { id: registryItemId },
    select: { id: true, source: true, registry: { select: { userId: true, slug: true } } },
  });
  // Same error for missing and foreign items: no existence oracle.
  if (!item || item.registry.userId !== session.user.id) throw new Error("Not found");
  if (item.source !== "AMAZON" && item.source !== "EXTERNAL") throw new Error("Only external items can be confirmed manually");

  // Atomic increment + clamp + status, same pattern as fulfillOrder.
  await db.$executeRaw(Prisma.sql`
    UPDATE registry_items
    SET "fulfilledQty" = LEAST(quantity, "fulfilledQty" + 1),
        status = CASE WHEN "fulfilledQty" + 1 >= quantity THEN 'FULFILLED'::"ItemStatus" ELSE 'PARTIALLY_FULFILLED'::"ItemStatus" END,
        "updatedAt" = NOW()
    WHERE id = ${item.id}
  `);

  revalidatePath(`/r/${item.registry.slug}`);
}
