"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators/checkout";
import { getPaymentProvider, type PaymentProviderType } from "@/lib/payments";
import { generateOrderNumber } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export async function createOrder(formData: FormData) {
  const session = await auth();

  // Rate limit checkout attempts. Identifier is the user ID when signed in,
  // otherwise the client IP — guests get a per-IP bucket so abuse is bounded
  // even without an account.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "anon";
  const identifier = session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`;
  const rl = await checkRateLimit("checkout", identifier);
  if (!rl.ok) {
    throw new Error("Too many checkout attempts. Please wait a moment and try again.");
  }

  // Safely parse JSON fields — malformed input should fail gracefully,
  // not crash the server with an unhandled JSON.parse exception.
  let registryItemIds: unknown;
  let quantities: unknown;
  try {
    registryItemIds = JSON.parse(formData.get("registryItemIds") as string);
    quantities = JSON.parse(formData.get("quantities") as string);
  } catch {
    throw new Error("Invalid order data");
  }

  const raw = {
    registryItemIds,
    quantities,
    buyerName: formData.get("buyerName") as string,
    buyerEmail: formData.get("buyerEmail") as string,
    buyerPhone: (formData.get("buyerPhone") as string) || undefined,
    giftMessage: (formData.get("giftMessage") as string) || undefined,
    isAnonymous: formData.get("isAnonymous") === "true",
    paymentProvider: formData.get("paymentProvider") as string,
  };

  const data = checkoutSchema.parse(raw);

  // Fetch items with prices
  const items = await db.registryItem.findMany({
    where: { id: { in: data.registryItemIds } },
    include: {
      registry: { select: { slug: true } },
    },
  });

  if (items.length === 0) {
    throw new Error("No items found");
  }

  // Calculate totals
  let totalHTG = 0;
  let totalUSD = 0;
  const orderItems = items.map((item) => {
    const qty = data.quantities[item.id] || 1;
    const htg = item.priceHTG ? Number(item.priceHTG) * qty : 0;
    const usd = item.priceUSD ? Number(item.priceUSD) * qty : 0;
    totalHTG += htg;
    totalUSD += usd;
    return {
      registryItemId: item.id,
      quantity: qty,
      priceHTG: item.priceHTG ? Number(item.priceHTG) : null,
      priceUSD: item.priceUSD ? Number(item.priceUSD) : null,
    };
  });

  const orderNumber = generateOrderNumber();

  // Determine currency for payment
  const currency = ["moncash", "natcash"].includes(data.paymentProvider)
    ? "HTG"
    : "USD";
  const amount = currency === "HTG" ? totalHTG : totalUSD;

  if (amount <= 0) {
    throw new Error("Invalid order amount");
  }

  // Calculate platform fee (5%)
  const platformFee = Math.round(amount * 0.05 * 100) / 100;

  // Create order
  const order = await db.order.create({
    data: {
      orderNumber,
      buyerId: session?.user?.id || null,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      buyerPhone: data.buyerPhone,
      giftMessage: data.giftMessage,
      isAnonymous: data.isAnonymous,
      totalHTG: totalHTG > 0 ? totalHTG : null,
      totalUSD: totalUSD > 0 ? totalUSD : null,
      platformFee,
      items: {
        create: orderItems,
      },
    },
  });

  // Create payment
  const provider = getPaymentProvider(
    data.paymentProvider as PaymentProviderType
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const registrySlug = items[0].registry.slug;

  const paymentResult = await provider.createPayment({
    orderId: order.id,
    amount,
    currency: currency as "HTG" | "USD",
    description: `KadoLakay - ${orderNumber}`,
    returnUrl: `${baseUrl}/r/${registrySlug}?order=${orderNumber}&status=success`,
    cancelUrl: `${baseUrl}/r/${registrySlug}?order=${orderNumber}&status=cancelled`,
  });

  await db.payment.create({
    data: {
      orderId: order.id,
      provider: data.paymentProvider.toUpperCase() as "STRIPE" | "PAYPAL" | "MONCASH" | "NATCASH",
      currency,
      amountHTG: totalHTG > 0 ? totalHTG : null,
      amountUSD: totalUSD > 0 ? totalUSD : null,
      stripePaymentId:
        data.paymentProvider === "stripe"
          ? paymentResult.providerRef
          : null,
      paypalOrderId:
        data.paymentProvider === "paypal"
          ? paymentResult.providerRef
          : null,
      moncashTxId:
        data.paymentProvider === "moncash"
          ? paymentResult.providerRef
          : null,
    },
  });

  return {
    orderId: order.id,
    orderNumber,
    redirectUrl: paymentResult.redirectUrl,
    clientSecret: paymentResult.clientSecret,
  };
}

export async function confirmExternalPurchase(registryItemId: string) {
  const item = await db.registryItem.findUnique({
    where: { id: registryItemId },
    include: { registry: { select: { slug: true } } },
  });

  if (!item) throw new Error("Item not found");

  await db.registryItem.update({
    where: { id: registryItemId },
    data: {
      fulfilledQty: { increment: 1 },
      status:
        item.fulfilledQty + 1 >= item.quantity
          ? "FULFILLED"
          : "PARTIALLY_FULFILLED",
    },
  });

  revalidatePath(`/r/${item.registry.slug}`);
}
