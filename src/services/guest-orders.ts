import { decryptField } from "@/lib/security-crypto";
import { deliverySchema } from "./order-contact";
import { z } from "zod";
import { db } from "@/lib/db";
import { entityIdSchema } from "@/lib/validators/entity-id";
import { createOrderGrant, orderGrantValid } from "@/lib/order-access";
export async function unlockGuestOrder(code: unknown) {
  const capability = z.uuid().parse(code);
  const order = await db.order.findFirst({
    where: { checkoutRequestId: capability, buyerId: null },
    select: { id: true },
  });
  if (!order) throw new Error("ORDER_UNAVAILABLE");
  return { id: order.id, grant: createOrderGrant(order.id, capability) };
}
export async function guestOrder(id: string, grant: unknown) {
  id = entityIdSchema.parse(id);
  const order = await db.order.findFirst({
    where: { id, buyerId: null },
    select: {
      id: true,
      checkoutRequestId: true,
      orderNumber: true,
      deliveryContactEncrypted: true,
      refundRequests: {
        select: { id: true, businessId: true, state: true, reason: true },
      },
      status: true,
      payment: { select: { status: true, currency: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          product: {
            select: { business: { select: { id: true, name: true } } },
          },
          registryItem: {
            select: {
              title: true,
              business: { select: { id: true, name: true } },
            },
          },
        },
        take: 20,
      },
      fulfillments: {
        select: {
          businessId: true,
          state: true,
          method: true,
          instructions: true,
          business: { select: { name: true } },
        },
      },
    },
  });
  if (!order || !orderGrantValid(grant, id, order.checkoutRequestId))
    return null;
  const { checkoutRequestId, deliveryContactEncrypted, ...safe } = order;
  void checkoutRequestId;
  return {
    ...safe,
    contact: deliveryContactEncrypted
      ? deliverySchema
          .omit({ orderId: true })
          .parse(
            JSON.parse(
              decryptField(deliveryContactEncrypted, `order-contact:${id}`),
            ),
          )
      : null,
  };
}
