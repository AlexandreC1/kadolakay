import { db } from "./db";
import { sendGiftNotification, sendOrderConfirmation } from "./email";

/**
 * Mark an order as paid and fulfill the associated registry items.
 * Shared across all payment webhook handlers (Stripe, PayPal, MonCash).
 *
 * FLOW:
 *   1. Mark the order as PAID
 *   2. Update each registry item's fulfilledQty and status
 *   3. Send notification email to the registry owner ("you got a gift!")
 *   4. Send confirmation email to the buyer ("thanks for your purchase!")
 *
 * Email sending is fire-and-forget — if it fails, we log the error but
 * don't throw, because the payment is already processed and the order
 * is already fulfilled. A failed email shouldn't reverse a payment.
 */
export async function fulfillOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          registryItem: {
            include: {
              registry: {
                include: {
                  user: { select: { email: true, name: true } },
                },
              },
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!order) throw new Error(`Order not found: ${orderId}`);

  // Update order status
  await db.order.update({
    where: { id: orderId },
    data: { status: "PAID" },
  });

  // Update registry item fulfillment
  for (const oi of order.items) {
    const newFulfilled = oi.registryItem.fulfilledQty + oi.quantity;
    await db.registryItem.update({
      where: { id: oi.registryItemId },
      data: {
        fulfilledQty: newFulfilled,
        status:
          newFulfilled >= oi.registryItem.quantity
            ? "FULFILLED"
            : "PARTIALLY_FULFILLED",
      },
    });
  }

  // --- Send notification emails (fire-and-forget) ---
  const firstItem = order.items[0]?.registryItem;
  if (firstItem) {
    const registry = firstItem.registry;
    const itemNames = order.items.map((oi) => oi.registryItem.title);
    const buyerName = order.isAnonymous ? "Yon moun" : order.buyerName;

    // Notify the registry owner
    if (registry.user?.email) {
      sendGiftNotification({
        recipientEmail: registry.user.email,
        recipientName: registry.user.name || "Zanmi",
        buyerName,
        giftMessage: order.giftMessage,
        itemNames,
        registryTitle: registry.title,
        registrySlug: registry.slug,
        orderNumber: order.orderNumber,
      });
    }

    // Confirm to the buyer
    const totalAmount = order.payment?.currency === "HTG"
      ? Number(order.totalHTG || 0)
      : Number(order.totalUSD || 0);

    sendOrderConfirmation({
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      itemNames,
      registryTitle: registry.title,
      orderNumber: order.orderNumber,
      totalAmount,
      currency: (order.payment?.currency as "HTG" | "USD") || "USD",
    });
  }

  return order;
}

/**
 * Get the registry slug for an order (for redirect after payment).
 */
export async function getRegistrySlugForOrder(orderId: string) {
  const orderItem = await db.orderItem.findFirst({
    where: { orderId },
    include: {
      registryItem: {
        include: {
          registry: { select: { slug: true } },
        },
      },
    },
  });

  return orderItem?.registryItem.registry.slug || null;
}
