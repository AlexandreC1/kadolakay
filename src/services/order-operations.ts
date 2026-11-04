import { orderGrantValid } from "@/lib/order-access";
import { z } from "zod";
import { db } from "@/lib/db";
import { entityIdSchema, parseEntityId } from "@/lib/validators/entity-id";
import { lockActor } from "./locked-actor";
import { auditOperation } from "./operation-audit";
import { toMinorUnits } from "./money";
export const fulfillmentStates = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SHIPPED",
  "DELIVERED",
] as const;
export type FulfillmentState = (typeof fulfillmentStates)[number];
export const fulfillmentTransitions: Record<
  FulfillmentState,
  readonly FulfillmentState[]
> = {
  NEW: ["ACCEPTED"],
  ACCEPTED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["SHIPPED", "DELIVERED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
};
export const fulfillmentSchema = z.strictObject({
  orderId: entityIdSchema,
  businessId: entityIdSchema.optional(),
  state: z.enum(fulfillmentStates),
  method: z.enum(["PICKUP", "DELIVERY"]),
  instructions: z.string().trim().max(1000).default(""),
});
const paidStates = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;
export async function transitionFulfillment(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = fulfillmentSchema.parse(input);
  return db.$transaction(async (tx) => {
    await lockActor(
      tx,
      actorId,
      data.businessId ? "admin:order" : "order:fulfill",
    );
    const b = await tx.business.findUnique({
      where: data.businessId ? { id: data.businessId } : { ownerId: actorId },
      select: { id: true },
    });
    if (!b) throw new Error("ORDER_UNAVAILABLE");
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${data.orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({
      where: {
        id: data.orderId,
        status: { in: [...paidStates] },
        payment: { status: "COMPLETED" },
      },
      include: {
        items: {
          select: {
            product: { select: { businessId: true } },
            registryItem: { select: { businessId: true } },
          },
        },
      },
    });
    if (
      !order ||
      !order.items.some(
        (i) => (i.product?.businessId || i.registryItem.businessId) === b.id,
      )
    )
      throw new Error("ORDER_UNAVAILABLE");
    if (
      await tx.refundRequest.findFirst({
        where: {
          orderId: order.id,
          businessId: b.id,
          state: { in: ["REQUESTED", "ACCEPTED"] },
        },
        select: { id: true },
      })
    )
      throw new Error("REQUEST_UNRESOLVED");
    const current = await tx.merchantFulfillment.findUnique({
      where: { orderId_businessId: { orderId: order.id, businessId: b.id } },
    });
    const state = (current?.state || "NEW") as FulfillmentState;
    if (state === data.state) return;
    if (
      !fulfillmentTransitions[state]?.includes(data.state) ||
      (data.method === "PICKUP" && data.state === "SHIPPED") ||
      (data.method === "DELIVERY" &&
        state === "READY" &&
        data.state === "DELIVERED")
    )
      throw new Error("INVALID_FULFILLMENT_TRANSITION");
    if (current && state !== "NEW" && current.method !== data.method)
      throw new Error("FULFILLMENT_METHOD_LOCKED");
    const next = await tx.merchantFulfillment.upsert({
      where: { orderId_businessId: { orderId: order.id, businessId: b.id } },
      create: {
        orderId: order.id,
        businessId: b.id,
        state: data.state,
        method: data.method,
        instructions: data.instructions,
      },
      update: { state: data.state, instructions: data.instructions },
    });
    await auditOperation(
      tx,
      actorId,
      "FULFILLMENT_CHANGED",
      "FULFILLMENT",
      next.id,
      state,
      data.state,
    );
    if (data.state === "DELIVERED") {
      const merchants = [
        ...new Set(
          order.items
            .map((i) => i.product?.businessId || i.registryItem.businessId)
            .filter(Boolean),
        ),
      ] as string[];
      const delivered = await tx.merchantFulfillment.count({
        where: {
          orderId: order.id,
          businessId: { in: merchants },
          state: "DELIVERED",
        },
      });
      if (merchants.length && delivered === merchants.length)
        await tx.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED" },
        });
    }
  });
}
export const refundRequestSchema = z.strictObject({
  orderId: entityIdSchema,
  businessId: entityIdSchema,
  kind: z.enum(["CANCELLATION", "REFUND"]),
  reason: z.string().trim().min(5).max(1000),
});
export async function requestOrderResolution(actorId: string, input: unknown) {
  return requestResolution({ userId: parseEntityId(actorId) }, input);
}
export async function requestGuestOrderResolution(
  grant: string,
  input: unknown,
) {
  return requestResolution({ guestGrant: grant }, input);
}
async function requestResolution(
  identity: { userId: string } | { guestGrant: string },
  input: unknown,
) {
  const actorId = "userId" in identity ? identity.userId : null;
  const data = refundRequestSchema.parse(input);
  return db.$transaction(async (tx) => {
    if (actorId) await lockActor(tx, actorId, "order:request");
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${data.orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({
      where: {
        id: data.orderId,
        buyerId: actorId,
        payment: { status: "COMPLETED" },
      },
      include: {
        payment: true,
        items: {
          select: {
            quantity: true,
            priceUSD: true,
            priceHTG: true,
            product: { select: { businessId: true } },
            registryItem: { select: { businessId: true } },
          },
        },
      },
    });
    const lines = order?.items.filter(
      (i) =>
        (i.product?.businessId || i.registryItem.businessId) ===
        data.businessId,
    );
    if (
      !order?.payment ||
      !lines?.length ||
      (!actorId &&
        !(
          "guestGrant" in identity &&
          orderGrantValid(
            identity.guestGrant,
            order.id,
            order.checkoutRequestId,
          )
        ))
    )
      throw new Error("ORDER_UNAVAILABLE");
    const fulfillment = await tx.merchantFulfillment.findUnique({
      where: {
        orderId_businessId: { orderId: order.id, businessId: data.businessId },
      },
    });
    if (
      data.kind === "CANCELLATION" &&
      (order.status === "CANCELLED" ||
        ["SHIPPED", "DELIVERED"].includes(fulfillment?.state || ""))
    )
      throw new Error("CANCELLATION_TOO_LATE");
    const currency = order.payment.currency;
    if (!["USD", "HTG"].includes(currency)) throw new Error("INVALID_CURRENCY");
    const amount = lines.reduce((sum, i) => {
      const price = currency === "USD" ? i.priceUSD : i.priceHTG;
      if (!price) throw new Error("INVALID_PRICE");
      return sum + BigInt(toMinorUnits(price)) * BigInt(i.quantity);
    }, BigInt(0));
    const existing = await tx.refundRequest.findUnique({
      where: {
        orderId_businessId: { orderId: order.id, businessId: data.businessId },
      },
    });
    if (existing) return { id: existing.id };
    const request = await tx.refundRequest.create({
      data: {
        ...data,
        requesterId: actorId || `guest:${order.id}`,
        amountMinor: amount,
        currency,
      },
    });
    await auditOperation(
      tx,
      actorId || `guest:${order.id}`,
      "ORDER_RESOLUTION_REQUESTED",
      "REFUND_REQUEST",
      request.id,
      undefined,
      "REQUESTED",
    );
    return { id: request.id };
  });
}
export async function decideOrderResolution(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = z
    .strictObject({
      requestId: entityIdSchema,
      state: z.enum(["ACCEPTED", "DECLINED"]),
      businessId: entityIdSchema.optional(),
    })
    .parse(input);
  await db.$transaction(async (tx) => {
    await lockActor(
      tx,
      actorId,
      data.businessId ? "admin:order" : "order:refund",
    );
    const b = await tx.business.findUnique({
      where: data.businessId ? { id: data.businessId } : { ownerId: actorId },
      select: { id: true },
    });
    if (!b) throw new Error("REQUEST_UNAVAILABLE");
    const initial = await tx.refundRequest.findFirst({
      where: { id: data.requestId, businessId: b.id },
      select: { orderId: true },
    });
    if (!initial) throw new Error("REQUEST_UNAVAILABLE");
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${initial.orderId} FOR UPDATE`;
    const request = await tx.refundRequest.findFirst({
      where: { id: data.requestId, businessId: b.id },
    });
    if (!request) throw new Error("REQUEST_UNAVAILABLE");
    if (request.state === data.state) return;
    if (request.state !== "REQUESTED")
      throw new Error("REQUEST_ALREADY_DECIDED");
    await tx.refundRequest.update({
      where: { id: request.id },
      data: { state: data.state },
    });
    await auditOperation(
      tx,
      actorId,
      "ORDER_RESOLUTION_DECIDED",
      "REFUND_REQUEST",
      request.id,
      request.state,
      data.state,
    );
    // Financial statuses, inventory and provider refunds are deliberately untouched.
  });
}
export const refundMethods = [
  "MONCASH",
  "NATCASH",
  "BANK_TRANSFER",
  "CARD",
  "CASH",
  "OTHER",
] as const;
export type RefundMethod = (typeof refundMethods)[number];
/** Plain printable reference text: no markup, no control characters. */
const refundReferenceSchema = z
  .string()
  .trim()
  .max(100)
  .regex(/^[\p{L}\p{N} .,:#/_+-]*$/u);
export const refundRecordSchema = z
  .strictObject({
    requestId: entityIdSchema,
    method: z.enum(refundMethods),
    reference: refundReferenceSchema.default(""),
    businessId: entityIdSchema.optional(),
  })
  .refine((d) => d.method === "CASH" || d.reference.length >= 3, {
    path: ["reference"],
    message: "REFERENCE_REQUIRED",
  });
/**
 * Records that the merchant paid an accepted request back outside Bayou.
 *
 * Merchants are the sellers and issue their own refunds (docs/DECISIONS.md), so this is the
 * merchant's evidence, shown to the buyer as such. It never changes the order, the payment
 * or stock: a recorded refund is not a provider-confirmed one, and refunds are never restocked.
 * Admins may record on a merchant's behalf with businessId (admin:order plus step-up).
 */
export async function recordRefundSent(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = refundRecordSchema.parse(input);
  await db.$transaction(async (tx) => {
    await lockActor(
      tx,
      actorId,
      data.businessId ? "admin:order" : "order:refund",
    );
    const b = await tx.business.findUnique({
      where: data.businessId ? { id: data.businessId } : { ownerId: actorId },
      select: { id: true },
    });
    if (!b) throw new Error("REQUEST_UNAVAILABLE");
    const initial = await tx.refundRequest.findFirst({
      where: { id: data.requestId, businessId: b.id },
      select: { orderId: true },
    });
    if (!initial) throw new Error("REQUEST_UNAVAILABLE");
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${initial.orderId} FOR UPDATE`;
    const request = await tx.refundRequest.findFirst({
      where: { id: data.requestId, businessId: b.id },
    });
    if (!request) throw new Error("REQUEST_UNAVAILABLE");
    // Same record sent twice (double click, retry) is a no-op; a different one is refused.
    if (request.state === "REFUNDED") {
      if (
        request.refundMethod === data.method &&
        (request.refundReference || "") === data.reference
      )
        return;
      throw new Error("REQUEST_ALREADY_DECIDED");
    }
    if (request.state !== "ACCEPTED") throw new Error("REFUND_NOT_ACCEPTED");
    await tx.refundRequest.update({
      where: { id: request.id },
      data: {
        state: "REFUNDED",
        refundMethod: data.method,
        refundReference: data.reference || null,
        refundedAt: new Date(),
        refundRecordedBy: actorId,
      },
    });
    await auditOperation(
      tx,
      actorId,
      "REFUND_RECORDED",
      "REFUND_REQUEST",
      request.id,
      "ACCEPTED",
      `REFUNDED:${data.method}`,
    );
    // Order status, payment status and inventory are deliberately untouched.
  });
}
