/**
 * =============================================================================
 * Order Fulfillment — KadoLakay
 * =============================================================================
 *
 * WHY THIS FILE EXISTS:
 * When someone pays for a gift, three things need to happen:
 *   1. Mark the order as PAID
 *   2. Update the registry item's fulfillment count
 *   3. Notify the registry owner and buyer via email
 *
 * This logic is shared across ALL payment webhooks (Stripe, PayPal, MonCash).
 * Instead of duplicating it in each webhook handler, we centralize it here.
 *
 * CRITICAL SAFETY MEASURES:
 *
 * 1. IDEMPOTENCY — A webhook might fire multiple times for the same payment.
 *    If an order is already PAID, we skip fulfillment (no double-counting).
 *
 * 2. ATOMIC TRANSACTION — We use Prisma's $transaction to ensure that either
 *    ALL database updates succeed or NONE do. Without this, a crash between
 *    updating the order and updating the items would leave data inconsistent.
 *
 * 3. ATOMIC INCREMENT — Instead of reading fulfilledQty, adding to it, and
 *    writing it back (read-modify-write), we use Prisma's `increment` operator.
 *    This prevents race conditions when two webhooks fire at the same time:
 *
 *    BAD (race condition):
 *      Thread A reads fulfilledQty = 0
 *      Thread B reads fulfilledQty = 0
 *      Thread A writes fulfilledQty = 1
 *      Thread B writes fulfilledQty = 1  ← WRONG! Should be 2
 *
 *    GOOD (atomic increment):
 *      Thread A: INCREMENT fulfilledQty BY 1  → 1
 *      Thread B: INCREMENT fulfilledQty BY 1  → 2  ✓
 *
 * 4. FIRE-AND-FORGET EMAILS — Email failures are logged but never throw.
 *    A failed email shouldn't reverse a successful payment.
 * =============================================================================
 */

import { db } from "./db";
import { sendGiftNotification, sendOrderConfirmation } from "./email";

/**
 * Mark an order as paid and fulfill the associated registry items.
 * Returns the fulfilled order, or null if the order was already fulfilled
 * (idempotency guard).
 */
export async function fulfillOrder(orderId: string) {
  // ── Step 1: Load the order with all related data ──
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

  // ── Step 2: Idempotency guard ──
  // If a webhook fires twice for the same payment, skip the second call.
  // This prevents double-fulfillment without needing a separate idempotency table.
  if (order.status === "PAID") {
    console.log(`Order ${orderId} already fulfilled, skipping (idempotent).`);
    return null;
  }

  // ── Step 3: Atomic transaction — all or nothing ──
  // Wrap order status update AND item fulfillment in a single transaction.
  // If anything fails, everything rolls back.
  await db.$transaction(async (tx) => {
    // Mark order as paid
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });

    // Update each registry item's fulfillment using atomic increment.
    // We batch all updates inside the same transaction.
    for (const oi of order.items) {
      const updatedItem = await tx.registryItem.update({
        where: { id: oi.registryItemId },
        data: {
          fulfilledQty: { increment: oi.quantity },
        },
      });

      // Determine new status based on the incremented value
      await tx.registryItem.update({
        where: { id: oi.registryItemId },
        data: {
          status:
            updatedItem.fulfilledQty >= updatedItem.quantity
              ? "FULFILLED"
              : "PARTIALLY_FULFILLED",
        },
      });
    }
  });

  // ── Step 4: Send notification emails (fire-and-forget) ──
  // These happen OUTSIDE the transaction because:
  //   a) Email is a side effect — it shouldn't block the DB transaction
  //   b) If email fails, the payment is still valid
  //   c) Emails are not idempotent anyway (duplicate emails are annoying but harmless)
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
 * Used by MonCash and PayPal return URL handlers to redirect the user
 * back to the correct registry page.
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
