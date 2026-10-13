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
 * 1. IDEMPOTENCY — A webhook might fire multiple times for the same payment,
 *    sometimes at the same instant. The order is claimed with a conditional
 *    write (PAID only if not already PAID) inside the transaction, so exactly
 *    one delivery fulfills it, even when two run concurrently.
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

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { enqueueEmailWith, scheduleDrain } from "./email/outbox";
import { emailDedupeKey, type EmailLocale } from "./contracts/email";
import { log } from "./log";
import { money, type Currency } from "./money";
import {
  verificationMismatch,
  type ClaimAndFulfill,
  type ClaimOutcome,
  type ConfirmManualPayment,
  type VerifiedPayment,
} from "./contracts/payments";

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

  // ── Step 2: Fast-path idempotency check ──
  // Cheap early exit for the common case: a retry that arrives long after the
  // first delivery finished. This check alone is NOT enough — see Step 3.
  if (order.status === "PAID") {
    console.log(`Order ${orderId} already fulfilled, skipping (idempotent).`);
    return null;
  }

  // ── Step 3: Atomic transaction — all or nothing ──
  // Wrap order status update AND item fulfillment in a single transaction.
  // If anything fails, everything rolls back.
  const claimed = await db.$transaction(async (tx) => {
    // Claim the order with a conditional write: "set PAID only if not PAID".
    //
    // The Step 2 check reads, then this writes — a check-then-act gap. Two
    // deliveries of the same webhook (MonCash and PayPal retry; only Stripe
    // has its own event-id claim upstream) can both read PENDING in Step 2 and
    // both reach this point. With a plain `update`, both would then increment
    // the items and the gift would be counted twice.
    //
    // `updateMany` with a status condition compiles to a single
    // `UPDATE ... WHERE id = ? AND status <> 'PAID'`. Postgres row-locks the
    // order during that statement, so the second transaction waits, re-checks
    // the condition after the first commits, and matches zero rows. The
    // database decides the winner, not JavaScript.
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: { status: "PAID" },
    });
    if (count === 0) return false;

    // Update each registry item's fulfillment.
    //
    // One statement per item, doing the increment, the clamp and the status
    // in a single write. The previous version issued two updates — increment,
    // then read the result back and set status — which is both an extra round
    // trip and a stale read if anything else touched the row in between.
    //
    // LEAST() is the important part. `createOrder` checks stock before taking
    // payment, but two buyers can pass that check at the same moment for the
    // last remaining item; both then pay, and both webhooks land here. Without
    // the clamp the registry ends up reporting more gifts received than were
    // ever asked for (2 of 1 cribs). Clamping keeps the displayed count
    // truthful; the duplicate payment is a refund question, not a data one.
    for (const oi of order.items) {
      await tx.$executeRaw`
        UPDATE registry_items
        SET "fulfilledQty" = LEAST(quantity, "fulfilledQty" + ${oi.quantity}),
            status = CASE
              WHEN "fulfilledQty" + ${oi.quantity} >= quantity
                THEN 'FULFILLED'::"ItemStatus"
              ELSE 'PARTIALLY_FULFILLED'::"ItemStatus"
            END,
            "updatedAt" = NOW()
        WHERE id = ${oi.registryItemId}
      `;
    }

    // Queue notification emails in the SAME transaction as the claim: they
    // exist iff the order was fulfilled, and the dedupeKey makes a re-run a
    // no-op. The send-emails cron delivers them (with retries).
    const firstItem = order.items[0]?.registryItem;
    if (firstItem) {
      const registry = firstItem.registry;
      const itemNames = order.items.map((oi) => oi.registryItem.title);
      const locale = (["ht", "fr", "en"].includes(registry.locale) ? registry.locale : "ht") as EmailLocale;
      if (registry.user?.email) {
        await enqueueEmailWith(tx, {
          template: "gift-notification",
          to: registry.user.email,
          locale,
          dedupeKey: emailDedupeKey("order", order.id, "gift-notification"),
          payload: {
            recipientName: registry.user.name || "Zanmi",
            buyerName: order.isAnonymous ? "Yon moun" : order.buyerName,
            giftMessage: order.giftMessage,
            itemNames,
            registryTitle: registry.title,
            registrySlug: registry.slug,
            orderNumber: order.orderNumber,
          },
        });
      }
      const currency = (order.payment?.currency as "HTG" | "USD") || "USD";
      const total = currency === "HTG" ? order.totalHTG : order.totalUSD;
      await enqueueEmailWith(tx, {
        template: "order-receipt",
        to: order.buyerEmail,
        locale,
        dedupeKey: emailDedupeKey("order", order.id, "order-receipt"),
        payload: {
          buyerName: order.buyerName,
          itemNames,
          registryTitle: registry.title,
          orderNumber: order.orderNumber,
          totalAmount: Number(total ?? 0).toFixed(2),
          currency,
        },
      });
    }
    return true;
  });

  // Lost the race: another delivery already fulfilled this order. Returning
  // here also means its emails go out once, not twice.
  if (!claimed) {
    console.log(`Order ${orderId} fulfilled concurrently, skipping (idempotent).`);
    return null;
  }

  // Step 4: the outbox rows queued inside the transaction are now committed;
  // deliver them right after the response (the daily cron is only a fallback).
  scheduleDrain();
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

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError
    ? err.code === "P2002"
    : typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * The single entry point every provider handler calls after verify()
 * (contract §4.2). Compares what the provider reported with what we
 * expected, claims the transaction exactly once, then fulfills.
 */
export const claimAndFulfill: ClaimAndFulfill = async (v: VerifiedPayment): Promise<ClaimOutcome> => {
  const payment = await db.payment.findUnique({
    where: { orderId: v.orderId },
    select: { provider: true, status: true, currency: true, amountExpected: true, amountHTG: true, amountUSD: true },
  });
  if (!payment || payment.provider !== v.provider) {
    log.warn("claimAndFulfill: unknown order or provider mismatch", { orderId: v.orderId, provider: v.provider });
    return "rejected";
  }
  const currency = payment.currency as Currency;
  // Orders created before amountExpected existed fall back to the stored total.
  const expectedRaw = payment.amountExpected ?? (currency === "HTG" ? payment.amountHTG : payment.amountUSD);
  if (expectedRaw == null) return "rejected";
  const mismatch = verificationMismatch(v, { orderId: v.orderId, amount: money(expectedRaw.toString()), currency });
  if (mismatch) {
    log.error("claimAndFulfill: verification mismatch, NOT fulfilling", {
      orderId: v.orderId, provider: v.provider, mismatch, reported: v.amount.toFixed(2), currency: v.currency,
    });
    return "rejected";
  }

  if (payment.status !== "COMPLETED") {
    try {
      await db.payment.update({
        where: { orderId: v.orderId },
        data: {
          status: "COMPLETED",
          providerTxId: v.providerTxId,
          providerEventId: v.providerEventId ?? null,
          paidAt: new Date(),
          providerResponse: v.rawSummary as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Same tx / event already claimed (by this order on a retry, or another order).
      if (isUniqueViolation(err)) return "duplicate";
      throw err;
    }
  }
  const fulfilled = await fulfillOrder(v.orderId);
  return fulfilled ? "fulfilled" : "duplicate";
};

/** Admin confirmation of a manual Natcash transfer (used by WS5's admin screen). */
export const confirmManualPayment: ConfirmManualPayment = async ({ orderId, reference, adminId }) => {
  const ref = reference.trim();
  if (!/^[A-Za-z0-9-]{3,64}$/.test(ref)) return "rejected";
  const { count } = await db.payment.updateMany({
    where: { orderId, provider: "NATCASH", status: { in: ["PENDING", "PROCESSING"] } },
    data: {
      status: "COMPLETED",
      providerTxId: ref,
      manualReference: ref,
      manualConfirmedById: adminId,
      manualConfirmedAt: new Date(),
      paidAt: new Date(),
    },
  }).catch((err: unknown) => {
    if (isUniqueViolation(err)) return { count: -1 };
    throw err;
  });
  if (count === -1) return "rejected"; // reference already used for another order
  if (count === 0) return "duplicate";
  await db.auditLog.create({
    data: { actorId: adminId, action: "payment.manual_confirm", targetType: "order", targetId: orderId, meta: { reference: ref } },
  });
  const fulfilled = await fulfillOrder(orderId);
  return fulfilled ? "fulfilled" : "duplicate";
};

/** Order lookup for redirect pages: publicToken + slug of the order's registry. */
export async function getOrderRedirectTarget(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { publicToken: true, registry: { select: { slug: true } } },
  });
  if (!order) return null;
  const slug = order.registry?.slug ?? (await getRegistrySlugForOrder(orderId));
  return slug ? `/r/${slug}/checkout/success?t=${order.publicToken}` : null;
}
