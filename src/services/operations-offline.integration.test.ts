import { unlockGuestOrder, guestOrder } from "./guest-orders";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  transitionFulfillment,
  requestOrderResolution,
  decideOrderResolution,
  recordRefundSent,
} from "./order-operations";
import { changeAccount } from "./backoffice";
import { editBusinessProfile, replaceProductMedia } from "./merchant-workspace";
const run = process.env.RUN_DB_TESTS === "1",
  users: string[] = [],
  orders: string[] = [];
beforeAll(() => {
  if (run && !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
    throw new Error("Disposable test DB required");
});
afterAll(async () => {
  if (!run) return;
  for (const orderId of orders) {
    await db.refundRequest.deleteMany({ where: { orderId } });
    await db.merchantFulfillment.deleteMany({ where: { orderId } });
    await db.order.delete({ where: { id: orderId } });
  }
  for (const id of users) await db.user.delete({ where: { id } });
  await db.$disconnect();
});
async function user(
  role: "USER" | "BUSINESS_OWNER" | "SUPERADMIN" | "ADMIN" = "USER",
) {
  const u = await db.user.create({
    data: { email: `${randomUUID()}@example.invalid`, role },
  });
  users.push(u.id);
  return u;
}
async function fixture() {
  const buyer = await user(),
    recipient = await user(),
    merchants = await Promise.all([
      user("BUSINESS_OWNER"),
      user("BUSINESS_OWNER"),
    ]);
  const registry = await db.registry.create({
    data: {
      userId: recipient.id,
      slug: `operation-${randomUUID()}`,
      title: "Disposable order",
      type: "BIRTHDAY",
    },
  });
  const businesses: { id: string }[] = [],
    products: { id: string }[] = [],
    items: { id: string }[] = [];
  for (const merchant of merchants) {
    const b = await db.business.create({
      data: {
        ownerId: merchant.id,
        name: "Operation fixture",
        slug: `shop-${randomUUID()}`,
        category: "home",
        status: "APPROVED",
      },
    });
    businesses.push(b);
    const p = await db.product.create({
      data: {
        businessId: b.id,
        name: "Fixture item",
        priceUSD: "10.00",
        stockQuantity: 9,
      },
    });
    products.push(p);
    items.push(
      await db.registryItem.create({
        data: {
          registryId: registry.id,
          title: p.name,
          productId: p.id,
          businessId: b.id,
          source: "LOCAL_BUSINESS",
          priceUSD: "10.00",
          fulfilledQty: 1,
        },
      }),
    );
  }
  const order = await db.order.create({
    data: {
      orderNumber: `TEST-${randomUUID()}`,
      buyerId: buyer.id,
      buyerName: "Fictional buyer",
      buyerEmail: "buyer@example.invalid",
      status: "PAID",
      totalUSD: "20.00",
      payment: {
        create: {
          provider: "STRIPE",
          status: "COMPLETED",
          currency: "USD",
          amountUSD: "20.00",
        },
      },
      items: {
        create: items.map((i, n) => ({
          registryItemId: i.id,
          productId: products[n].id,
          quantity: 1,
          priceUSD: "10.00",
        })),
      },
    },
  });
  orders.push(order.id);
  return { buyer, merchants, businesses, products, order };
}
describe.skipIf(!run)("merchant operations and account governance", () => {
  it("requires a private random capability for guest tracking and never returns it", async () => {
    const f = await fixture(),
      code = randomUUID();
    const prior = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET =
      "fictional-guest-signing-key-at-least-32-characters";
    try {
      await db.order.update({
        where: { id: f.order.id },
        data: { buyerId: null, checkoutRequestId: code },
      });
      expect(await guestOrder(f.order.id, undefined)).toBeNull();
      const access = await unlockGuestOrder(code);
      const found = await guestOrder(access.id, access.grant);
      expect(found?.orderNumber).toBe(f.order.orderNumber);
      expect(found).not.toHaveProperty("checkoutRequestId");
      expect(found).not.toHaveProperty("buyerEmail");
      await expect(unlockGuestOrder(f.order.orderNumber)).rejects.toThrow();
      await db.order.update({
        where: { id: f.order.id },
        data: { buyerId: f.buyer.id },
      });
      expect(await guestOrder(access.id, access.grant)).toBeNull();
    } finally {
      if (prior === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = prior;
    }
  });
  it("enforces per-merchant ownership, transition sequence and complete mixed-order delivery", async () => {
    const f = await fixture();
    await expect(
      transitionFulfillment(f.merchants[0].id, {
        orderId: f.order.id,
        businessId: f.businesses[1].id,
        state: "ACCEPTED",
        method: "PICKUP",
      }),
    ).rejects.toThrow("Forbidden");
    await expect(
      transitionFulfillment(f.merchants[0].id, {
        orderId: f.order.id,
        state: "DELIVERED",
        method: "PICKUP",
      }),
    ).rejects.toThrow("INVALID_FULFILLMENT_TRANSITION");
    for (const [index, merchant] of f.merchants.entries()) {
      await Promise.all(
        [1, 2].map(() =>
          transitionFulfillment(merchant.id, {
            orderId: f.order.id,
            state: "ACCEPTED",
            method: "PICKUP",
          }),
        ),
      );
      for (const state of ["PREPARING", "READY", "DELIVERED"])
        await transitionFulfillment(merchant.id, {
          orderId: f.order.id,
          state,
          method: "PICKUP",
        });
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: f.order.id } }))
          .status,
      ).toBe(index === 0 ? "PAID" : "DELIVERED");
    }
    expect(
      (await db.payment.findUniqueOrThrow({ where: { orderId: f.order.id } }))
        .status,
    ).toBe("COMPLETED");
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: f.products[0].id } }))
        .stockQuantity,
    ).toBe(9);
  });
  it("requires verified payment rather than a paid-looking order status", async () => {
    const f = await fixture();
    await db.payment.update({
      where: { orderId: f.order.id },
      data: { status: "PENDING" },
    });
    await expect(
      transitionFulfillment(f.merchants[0].id, {
        orderId: f.order.id,
        state: "ACCEPTED",
        method: "PICKUP",
      }),
    ).rejects.toThrow("ORDER_UNAVAILABLE");
    expect(
      await db.merchantFulfillment.count({ where: { orderId: f.order.id } }),
    ).toBe(0);
  });
  it("scopes refund requests to the buyer and seller portion, coalesces retries and never refunds money", async () => {
    const f = await fixture(),
      other = await user(),
      input = {
        orderId: f.order.id,
        businessId: f.businesses[0].id,
        kind: "REFUND",
        reason: "Please resolve this test purchase",
      };
    await expect(requestOrderResolution(other.id, input)).rejects.toThrow(
      "ORDER_UNAVAILABLE",
    );
    const [a, b] = await Promise.all([
      requestOrderResolution(f.buyer.id, input),
      requestOrderResolution(f.buyer.id, input),
    ]);
    expect(a.id).toBe(b.id);
    const request = await db.refundRequest.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(request.amountMinor).toBe(BigInt(1000));
    await expect(
      decideOrderResolution(f.merchants[1].id, {
        requestId: a.id,
        state: "ACCEPTED",
      }),
    ).rejects.toThrow("REQUEST_UNAVAILABLE");
    await decideOrderResolution(f.merchants[0].id, {
      requestId: a.id,
      state: "ACCEPTED",
    });
    await expect(
      transitionFulfillment(f.merchants[0].id, {
        orderId: f.order.id,
        state: "ACCEPTED",
        method: "PICKUP",
      }),
    ).rejects.toThrow("REQUEST_UNRESOLVED");
    expect(
      (await db.payment.findUniqueOrThrow({ where: { orderId: f.order.id } }))
        .status,
    ).toBe("COMPLETED");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status,
    ).toBe("PAID");
  });
  it("records a refund the merchant sent, only after acceptance, without touching payment or stock", async () => {
    const f = await fixture(),
      admin = await user("ADMIN");
    const { id } = await requestOrderResolution(f.buyer.id, {
      orderId: f.order.id,
      businessId: f.businesses[0].id,
      kind: "REFUND",
      reason: "Item arrived damaged in this test",
    });
    const record = { requestId: id, method: "MONCASH", reference: "MC-123456" };
    // Not before the merchant accepts the request.
    await expect(recordRefundSent(f.merchants[0].id, record)).rejects.toThrow("REFUND_NOT_ACCEPTED");
    await decideOrderResolution(f.merchants[0].id, { requestId: id, state: "ACCEPTED" });
    // Another merchant, missing references and markup are refused.
    await expect(recordRefundSent(f.merchants[1].id, record)).rejects.toThrow("REQUEST_UNAVAILABLE");
    await expect(recordRefundSent(f.merchants[0].id, { ...record, reference: "" })).rejects.toThrow();
    await expect(recordRefundSent(f.merchants[0].id, { ...record, reference: "<script>" })).rejects.toThrow();
    const stockBefore = (await db.product.findUniqueOrThrow({ where: { id: f.products[0].id } })).stockQuantity;
    await Promise.all([recordRefundSent(f.merchants[0].id, record), recordRefundSent(f.merchants[0].id, record)]);
    const saved = await db.refundRequest.findUniqueOrThrow({ where: { id } });
    expect(saved).toMatchObject({ state: "REFUNDED", refundMethod: "MONCASH", refundReference: "MC-123456", refundRecordedBy: f.merchants[0].id });
    expect(saved.refundedAt).not.toBeNull();
    // A different second record is refused; the first stands.
    await expect(recordRefundSent(f.merchants[0].id, { ...record, reference: "MC-999999" })).rejects.toThrow("REQUEST_ALREADY_DECIDED");
    expect(await db.operationAuditEvent.count({ where: { targetId: id, action: "REFUND_RECORDED" } })).toBe(1);
    expect((await db.payment.findUniqueOrThrow({ where: { orderId: f.order.id } })).status).toBe("COMPLETED");
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("PAID");
    expect((await db.product.findUniqueOrThrow({ where: { id: f.products[0].id } })).stockQuantity).toBe(stockBefore);
    // An admin can record on the merchant's behalf (cash needs no reference).
    const second = await requestOrderResolution(f.buyer.id, {
      orderId: f.order.id,
      businessId: f.businesses[1].id,
      kind: "CANCELLATION",
      reason: "Changed plans in this test",
    });
    await decideOrderResolution(admin.id, { requestId: second.id, state: "ACCEPTED", businessId: f.businesses[1].id });
    await expect(recordRefundSent(f.merchants[0].id, { requestId: second.id, method: "CASH" })).rejects.toThrow("REQUEST_UNAVAILABLE");
    await recordRefundSent(admin.id, { requestId: second.id, method: "CASH", businessId: f.businesses[1].id });
    expect((await db.refundRequest.findUniqueOrThrow({ where: { id: second.id } })).refundRecordedBy).toBe(admin.id);
    // The database itself refuses a REFUNDED row without its evidence.
    await expect(
      db.$executeRaw`UPDATE refund_requests SET "refundMethod" = NULL WHERE id = ${id}`,
    ).rejects.toThrow();
  });
  it("protects the owner, invalidates suspended accounts and audits constrained staff delegation", async () => {
    const owner = await user("SUPERADMIN"),
      member = await user(),
      admin = await user("ADMIN");
    await expect(
      changeAccount(owner.id, { targetId: owner.id, operation: "SUSPEND" }),
    ).rejects.toThrow("OWNER_PROTECTED");
    await expect(
      changeAccount(admin.id, {
        targetId: member.id,
        operation: "ROLE",
        role: "ADMIN",
      }),
    ).rejects.toThrow("Forbidden");
    await changeAccount(owner.id, {
      targetId: member.id,
      operation: "ROLE",
      role: "ADMIN",
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: member.id } })).role,
    ).toBe("ADMIN");
    await changeAccount(owner.id, {
      targetId: member.id,
      operation: "SUSPEND",
    });
    await changeAccount(owner.id, {
      targetId: member.id,
      operation: "SUSPEND",
    });
    const current = await db.user.findUniqueOrThrow({
      where: { id: member.id },
    });
    expect(current.suspendedAt).not.toBeNull();
    expect(current.sessionVersion).toBe(2);
    expect(
      await db.userRoleAuditEvent.count({
        where: { targetId: member.id, source: "ADMIN_CONSOLE" },
      }),
    ).toBe(1);
  });
  it("returns changed approved profiles to review and saves media atomically without foreign access", async () => {
    const f = await fixture();
    await editBusinessProfile(f.merchants[0].id, {
      name: "Changed identity",
      category: "home",
      fulfillmentPolicy: "Pickup only, confirm with seller",
    });
    expect(
      (
        await db.business.findUniqueOrThrow({
          where: { id: f.businesses[0].id },
        })
      ).status,
    ).toBe("PENDING_REVIEW");
    await expect(
      replaceProductMedia(f.merchants[1].id, f.products[0].id, {
        urls: ["https://example.invalid/photo.jpg"],
        alt: "A fixture",
      }),
    ).rejects.toThrow("PRODUCT_UNAVAILABLE");
    await replaceProductMedia(f.merchants[0].id, f.products[0].id, {
      urls: [
        "https://example.invalid/one.jpg",
        "https://example.invalid/two.jpg",
      ],
      alt: "Authorized fixture",
    });
    expect(
      await db.productMedia.count({ where: { productId: f.products[0].id } }),
    ).toBe(2);
    await expect(
      replaceProductMedia(f.merchants[0].id, f.products[0].id, {
        urls: ["javascript:alert(1)"],
        alt: "bad",
      }),
    ).rejects.toThrow();
    expect(
      await db.productMedia.count({ where: { productId: f.products[0].id } }),
    ).toBe(2);
  });
});
