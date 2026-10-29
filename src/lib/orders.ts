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
 * 4. DURABLE EMAILS — Queue emails in the fulfillment transaction. Provider
 *    delivery happens separately; retries must never undo a paid order.
 * =============================================================================
 */

import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "./db";
import { enqueueEmailWith, scheduleDrain } from "./email/outbox";
import { emailDedupeKey, type EmailLocale } from "./contracts/email";
import { log } from "./log";
import { money, type Currency } from "./money";
import { reservationWhere } from "./payments/reservations";
import {
  verificationMismatch,
  type ClaimAndFulfill,
  type ClaimOutcome,
  type ConfirmManualPayment,
  type VerifiedPayment,
} from "./contracts/payments";

/**
 * Statuses a verified payment may move to PAID. EXPIRED and PAYMENT_FAILED are
 * here because money can still arrive late (Stripe async methods, a Natcash
 * transfer confirmed after the order expired). Anything past PAID (shipped,
 * refunded, cancelled, needs refund) is final for this path.
 */
export const CLAIMABLE_STATUSES: OrderStatus[] = ["PENDING", "EXPIRED", "PAYMENT_FAILED"];

/**
 * Mark an order as paid and fulfill the associated registry items.
 * Returns the fulfilled order, or null if the order was already fulfilled
 * (idempotency guard).
 */
export async function fulfillOrder(orderId: string, settlement?: Prisma.PaymentUpdateInput, audit?: Prisma.AuditLogUncheckedCreateInput) {
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
  if (!CLAIMABLE_STATUSES.includes(order.status)) {
    console.log(`Order ${orderId} is ${order.status}, not claimable, skipping (idempotent).`);
    return null;
  }

  // ── Step 3: Atomic transaction — all or nothing ──
  // Wrap order status update AND item fulfillment in a single transaction.
  // If anything fails, everything rolls back.
  const claimed = await db.$transaction(async (tx) => {
    // Lock the items first (same order as createOrder: items, then order) and
    // read their committed counts. If someone else's gift filled an item while
    // this buyer was paying (late payment after expiry, Natcash confirmed days
    // later), we must not pretend this one was fulfilled: the order becomes
    // NEEDS_REFUND and no item is touched.
    const itemIds = [...new Set(order.items.map((oi) => oi.registryItemId))].sort();
    const locked = itemIds.length
      ? await tx.$queryRaw<{ id: string; quantity: number; fulfilledQty: number }[]>`
          SELECT id, quantity, "fulfilledQty" FROM registry_items
          WHERE id IN (${Prisma.join(itemIds)}) ORDER BY id FOR UPDATE`
      : [];
    const byId = new Map(locked.map((r) => [r.id, r]));
    const held = itemIds.length ? await tx.orderItem.groupBy({
      by: ["registryItemId"],
      where: { registryItemId: { in: itemIds }, orderId: { not: orderId }, order: reservationWhere(new Date()) },
      _sum: { quantity: true },
    }) : [];
    const reserved = new Map(held.map((h) => [h.registryItemId, h._sum.quantity ?? 0]));
    const oversold = order.items.some((oi) => {
      const r = byId.get(oi.registryItemId);
      return !r || r.fulfilledQty + oi.quantity + (reserved.get(oi.registryItemId) ?? 0) > r.quantity;
    });

    // Claim the order with a conditional write: only a claimable status
    // (PENDING, EXPIRED, PAYMENT_FAILED) can become PAID. A refunded,
    // cancelled or shipped order is never re-fulfilled by a replayed webhook.
    //
    // The Step 2 check reads, then this writes — a check-then-act gap. Two
    // deliveries of the same webhook (MonCash and PayPal retry; only Stripe
    // has its own event-id claim upstream) can both read PENDING in Step 2 and
    // both reach this point. With a plain `update`, both would then increment
    // the items and the gift would be counted twice.
    //
    // `updateMany` with a status condition compiles to a single
    // `UPDATE ... WHERE id = ? AND status IN (...)`. Postgres row-locks the
    // order during that statement, so the second transaction waits, re-checks
    // the condition after the first commits, and matches zero rows. The
    // database decides the winner, not JavaScript.
    const target: OrderStatus = oversold ? "NEEDS_REFUND" : "PAID";
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: CLAIMABLE_STATUSES } },
      data: { status: target },
    });
    if (count === 0) return null;

    // Settlement, fulfillment and outbox must roll back together. A committed
    // COMPLETED payment must never be stranded by a later transaction failure.
    if (settlement) {
      await tx.payment.update({ where: { orderId }, data: settlement });
    }
    if (audit) await tx.auditLog.create({ data: audit });

    if (oversold) {
      await tx.auditLog.create({
        data: { action: "order.needs_refund", targetType: "order", targetId: orderId, meta: { reason: "items_already_gifted" } },
      });
      return target;
    }

    // Update each registry item's fulfillment.
    //
    // One statement per item, doing the increment, the clamp and the status
    // in a single write. The previous version issued two updates — increment,
    // then read the result back and set status — which is both an extra round
    // trip and a stale read if anything else touched the row in between.
    //
    // LEAST() is a last line of defence: the oversold check above already
    // routes an order that doesn't fit to NEEDS_REFUND, so the clamp should
    // never actually bite.
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
    return target;
  });

  // Lost the race: another delivery already fulfilled this order. Returning
  // here also means its emails go out once, not twice.
  if (!claimed) {
    console.log(`Order ${orderId} fulfilled concurrently, skipping (idempotent).`);
    return null;
  }
  if (claimed === "NEEDS_REFUND") {
    log.error("order.needs_refund: paid for items that were already fully gifted", { orderId });
    return { ...order, status: claimed };
  }

  // Step 4: the outbox rows queued inside the transaction are now committed;
  // deliver them right after the response (the daily cron is only a fallback).
  scheduleDrain();
  return { ...order, status: claimed };
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

  try {
    return outcomeOf(await fulfillOrder(v.orderId, payment.status !== "COMPLETED" ? {
      status: "COMPLETED",
      providerTxId: v.providerTxId,
      providerEventId: v.providerEventId ?? null,
      paidAt: new Date(),
      providerResponse: v.rawSummary as Prisma.InputJsonValue,
    } : undefined));
  } catch (err) {
    // The entire fulfillment transaction rolled back on a reused transaction.
    if (isUniqueViolation(err)) return "duplicate";
    throw err;
  }
};

function outcomeOf(fulfilled: Awaited<ReturnType<typeof fulfillOrder>>): ClaimOutcome {
  if (!fulfilled) return "duplicate";
  return fulfilled.status === "NEEDS_REFUND" ? "needs_refund" : "fulfilled";
}

/** Admin confirmation of a manual Natcash transfer (used by WS5's admin screen). */
export const confirmManualPayment: ConfirmManualPayment = async ({ orderId, reference, adminId }) => {
  const ref = reference.trim();
  if (!/^[A-Za-z0-9-]{3,64}$/.test(ref)) return "rejected";
  const payment = await db.payment.findUnique({ where: { orderId }, select: { provider: true, status: true } });
  if (!payment || payment.provider !== "NATCASH") return "rejected";
  if (!["PENDING", "PROCESSING", "FAILED"].includes(payment.status)) return "duplicate";
  try {
    return outcomeOf(await fulfillOrder(orderId, {
      status: "COMPLETED",
      providerTxId: ref,
      manualReference: ref,
      manualConfirmedById: adminId,
      manualConfirmedAt: new Date(),
      paidAt: new Date(),
    }, {
      actorId: adminId, action: "payment.manual_confirm", targetType: "order", targetId: orderId, meta: { reference: ref },
    }));
  } catch (err) {
    if (isUniqueViolation(err)) return "rejected";
    throw err;
  }
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
