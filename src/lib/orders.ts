import { db } from "./db";
import { sendGiftNotification, sendOrderConfirmation } from "./email";
import { toMinorUnits } from "@/services/money";
import { settleProductStock } from "@/services/inventory";

export interface PaymentEvidence {
  sessionId: string;
  eventId: string;
  amountMinor: number;
  currency: string;
}

/** Claims payment and consumes held stock in one transaction. */
export async function fulfillOrder(orderId: string, evidence?: PaymentEvidence) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { registryItem: { include: { registry: { include: { user: { select: { email: true, name: true } } } } } } } }, payment: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "PENDING") return null;
  if (!evidence || order.payment?.provider !== "STRIPE" ||
      evidence.currency.toLowerCase() !== "usd" || !order.payment.amountUSD ||
      evidence.amountMinor !== toMinorUnits(order.payment.amountUSD) ||
      (order.payment.stripePaymentId && order.payment.stripePaymentId !== evidence.sessionId)) {
    throw new Error("PAYMENT_EVIDENCE_MISMATCH");
  }
  const claimed = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "PAID" } });
    if (!count) return false;
    await settleProductStock(tx, order.items, true);
    for (const item of [...order.items].sort((a, b) => a.registryItemId.localeCompare(b.registryItemId))) {
      const changed = await tx.$executeRaw`
        UPDATE registry_items
        SET "fulfilledQty" = "fulfilledQty" + ${item.quantity}, "reservedQty" = "reservedQty" - ${item.quantity},
          status = CASE WHEN "fulfilledQty" + ${item.quantity} = quantity THEN 'FULFILLED'::"ItemStatus" ELSE 'PARTIALLY_FULFILLED'::"ItemStatus" END,
          "updatedAt" = NOW()
        WHERE id = ${item.registryItemId} AND "reservedQty" >= ${item.quantity} AND "fulfilledQty" + ${item.quantity} <= quantity
      `;
      if (changed !== 1) throw new Error("RESERVATION_MISMATCH");
    }
    await tx.payment.update({ where: { orderId }, data: { status: "COMPLETED", stripePaymentId: evidence.sessionId, providerEventId: evidence.eventId, paidAt: new Date() } });
    return true;
  }, { maxWait: 15000, timeout: 15000 });
  if (!claimed) return null;
  const registry = order.items[0]?.registryItem.registry;
  if (registry) {
    const itemNames = order.items.map((item) => item.registryItem.title);
    // Await notifications so a serverless runtime does not discard their work.
    // Delivery is best-effort; payment remains committed if email fails.
    await Promise.allSettled([
      registry.user.email ? sendGiftNotification({ recipientEmail: registry.user.email, recipientName: registry.user.name || "Zanmi", buyerName: order.isAnonymous ? "Yon moun" : order.buyerName, giftMessage: order.giftMessage, itemNames, registryTitle: registry.title, registrySlug: registry.slug, orderNumber: order.orderNumber }) : Promise.resolve(),
      sendOrderConfirmation({ buyerEmail: order.buyerEmail, buyerName: order.buyerName, itemNames, registryTitle: registry.title, orderNumber: order.orderNumber, totalAmount: Number(order.totalUSD), currency: "USD" }),
    ]);
  }
  return order;
}

export async function getRegistrySlugForOrder(orderId: string) {
  const item = await db.orderItem.findFirst({ where: { orderId }, select: { registryItem: { select: { registry: { select: { slug: true } } } } } });
  return item?.registryItem.registry.slug || null;
}
