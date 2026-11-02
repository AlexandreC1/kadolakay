import { unlockGuestOrder, guestOrder } from "./guest-orders";
import { saveGuestOrderContact } from "./order-contact";
import { requestGuestOrderResolution } from "./order-operations";
import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { readOrderContact, saveOrderContact } from "./order-contact";
const run = process.env.RUN_DB_TESTS === "1",
  users: string[] = [],
  orders: string[] = [];
beforeAll(() => {
  if (run) {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
      throw new Error("Test DB required");
    vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 8).toString("base64"));
  }
});
afterAll(async () => {
  if (!run) return;
  for (const orderId of orders) {
    await db.merchantFulfillment.deleteMany({ where: { orderId } });
    await db.order.delete({ where: { id: orderId } });
  }
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
  vi.unstubAllEnvs();
});
describe.skipIf(!run)("private delivery details", () => {
  it("encrypts at rest, denies foreign buyers/merchants, and locks edits when preparation starts", async () => {
    const buyer = await db.user.create({
        data: { email: randomUUID() + "@example.invalid" },
      }),
      merchant = await db.user.create({
        data: {
          email: randomUUID() + "@example.invalid",
          role: "BUSINESS_OWNER",
        },
      }),
      stranger = await db.user.create({
        data: {
          email: randomUUID() + "@example.invalid",
          role: "BUSINESS_OWNER",
        },
      });
    users.push(buyer.id, merchant.id, stranger.id);
    const b = await db.business.create({
      data: {
        ownerId: merchant.id,
        name: "Delivery fixture",
        slug: "delivery-" + randomUUID(),
        category: "home",
        status: "APPROVED",
      },
    });
    const r = await db.registry.create({
      data: {
        userId: buyer.id,
        title: "Delivery fixture",
        slug: "delivery-" + randomUUID(),
        type: "BIRTHDAY",
        items: { create: { title: "Gift", businessId: b.id } },
      },
      include: { items: true },
    });
    const o = await db.order.create({
      data: {
        buyerId: buyer.id,
        buyerName: "Fictional buyer",
        buyerEmail: "fiction@example.invalid",
        orderNumber: "TEST-" + randomUUID(),
        status: "PAID",
        payment: {
          create: {
            provider: "STRIPE",
            status: "COMPLETED",
            currency: "USD",
            amountUSD: "10",
          },
        },
        items: {
          create: {
            registryItemId: r.items[0].id,
            quantity: 1,
            priceUSD: "10",
          },
        },
      },
    });
    orders.push(o.id);
    const input = {
      orderId: o.id,
      recipientName: "Fictional Recipient",
      phone: "+50912345678",
      city: "Test city",
      address: "Fictional test address",
      instructions: "No real delivery",
    };
    await saveOrderContact(buyer.id, input);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: o.id } }))
        .deliveryContactEncrypted,
    ).not.toContain(input.address);
    expect(
      (await readOrderContact(merchant.id, o.id, "MERCHANT"))?.recipientName,
    ).toBe(input.recipientName);
    await expect(
      readOrderContact(stranger.id, o.id, "MERCHANT"),
    ).rejects.toThrow("ORDER_UNAVAILABLE");
    await expect(saveOrderContact(stranger.id, input)).rejects.toThrow(
      "CONTACT_LOCKED",
    );
    await db.merchantFulfillment.create({
      data: { orderId: o.id, businessId: b.id, state: "ACCEPTED" },
    });
    await expect(saveOrderContact(buyer.id, input)).rejects.toThrow(
      "CONTACT_LOCKED",
    );
    expect(
      await db.operationAuditEvent.count({
        where: { targetId: o.id, action: "ORDER_CONTACT_VIEWED" },
      }),
    ).toBe(1);
    vi.stubEnv(
      "AUTH_SECRET",
      "fictional-delivery-guest-key-at-least-32-characters",
    );
    const code = randomUUID();
    await db.merchantFulfillment.updateMany({
      where: { orderId: o.id },
      data: { state: "NEW" },
    });
    await db.order.update({
      where: { id: o.id },
      data: { buyerId: null, checkoutRequestId: code },
    });
    const access = await unlockGuestOrder(code);
    await expect(saveGuestOrderContact("tampered", input)).rejects.toThrow(
      "CONTACT_LOCKED",
    );
    await saveGuestOrderContact(access.grant, {
      ...input,
      instructions: "Updated by authorized guest",
    });
    expect((await guestOrder(o.id, access.grant))?.contact?.instructions).toBe(
      "Updated by authorized guest",
    );
    const request = {
      orderId: o.id,
      businessId: b.id,
      kind: "REFUND",
      reason: "Fictional guest resolution",
    };
    await expect(
      requestGuestOrderResolution("tampered", request),
    ).rejects.toThrow("ORDER_UNAVAILABLE");
    const saved = await requestGuestOrderResolution(access.grant, request);
    expect(saved.id).toBeTruthy();
    await db.refundRequest.deleteMany({ where: { orderId: o.id } });
  });
});
