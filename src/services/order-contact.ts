import { orderGrantValid } from "@/lib/order-access";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseEntityId, entityIdSchema } from "@/lib/validators/entity-id";
import { decryptField, encryptField } from "@/lib/security-crypto";
import { lockActor } from "./locked-actor";
import { auditOperation } from "./operation-audit";
import { merchantLines } from "./order-reads";
export const deliverySchema = z.strictObject({
  orderId: entityIdSchema,
  recipientName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(500),
  instructions: z.string().trim().max(500).default(""),
});
export async function saveOrderContact(actorId: string, input: unknown) {
  return saveContact({ userId: parseEntityId(actorId) }, input);
}
export async function saveGuestOrderContact(grant: string, input: unknown) {
  return saveContact({ guestGrant: grant }, input);
}
async function saveContact(
  identity: { userId: string } | { guestGrant: string },
  input: unknown,
) {
  const actorId = "userId" in identity ? identity.userId : null;
  const { orderId, ...contact } = deliverySchema.parse(input);
  await db.$transaction(async (tx) => {
    if (actorId) await lockActor(tx, actorId, "order:request");
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        buyerId: actorId,
        status: { in: ["PENDING", "PAID", "CONFIRMED"] },
      },
      select: {
        id: true,
        checkoutRequestId: true,
        fulfillments: {
          where: { state: { not: "NEW" } },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (
      !order ||
      (!actorId &&
        !(
          "guestGrant" in identity &&
          orderGrantValid(identity.guestGrant, orderId, order.checkoutRequestId)
        )) ||
      order.fulfillments.length
    )
      throw new Error("CONTACT_LOCKED");
    await tx.order.update({
      where: { id: orderId },
      data: {
        deliveryContactEncrypted: encryptField(
          JSON.stringify(contact),
          `order-contact:${orderId}`,
        ),
      },
    });
    await auditOperation(
      tx,
      actorId || `guest:${orderId}`,
      "ORDER_CONTACT_SAVED",
      "ORDER",
      orderId,
    );
  });
}
export async function readOrderContact(
  actorId: string,
  orderId: string,
  scope: "BUYER" | "MERCHANT" | "ADMIN",
) {
  actorId = parseEntityId(actorId);
  orderId = parseEntityId(orderId);
  return db.$transaction(async (tx) => {
    await lockActor(
      tx,
      actorId,
      scope === "ADMIN"
        ? "admin:order"
        : scope === "MERCHANT"
          ? "order:fulfill"
          : "order:request",
    );
    const business =
      scope === "MERCHANT"
        ? await tx.business.findUnique({
            where: { ownerId: actorId },
            select: { id: true },
          })
        : null;
    if (scope === "MERCHANT" && !business) throw new Error("ORDER_UNAVAILABLE");
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        ...(scope === "BUYER"
          ? { buyerId: actorId }
          : scope === "MERCHANT"
            ? {
                payment: { status: "COMPLETED" },
                items: { some: merchantLines(business!.id) },
              }
            : {}),
      },
      select: { deliveryContactEncrypted: true },
    });
    if (!order) throw new Error("ORDER_UNAVAILABLE");
    if (!order.deliveryContactEncrypted) return null;
    const contact = deliverySchema
      .omit({ orderId: true })
      .parse(
        JSON.parse(
          decryptField(
            order.deliveryContactEncrypted,
            `order-contact:${orderId}`,
          ),
        ),
      );
    if (scope !== "BUYER")
      await auditOperation(
        tx,
        actorId,
        "ORDER_CONTACT_VIEWED",
        "ORDER",
        orderId,
      );
    return contact;
  });
}
