import { db } from "./db";

/**
 * Mark an order as paid and fulfill the associated registry items.
 * Shared across all payment webhook handlers.
 */
export async function fulfillOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { registryItem: true },
      },
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
