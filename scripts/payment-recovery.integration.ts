import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { claimAndFulfill } from "../src/lib/orders";
import { money } from "../src/lib/money";
import { expireOrders } from "../src/lib/jobs/expire-orders";
import { loadPendingPayments, reconcilePayments } from "../src/lib/jobs/reconcile-payments";
import { assertCatalogAvailable, releaseVoidedPayPal, reservationWhere, reservePayPalCapture } from "../src/lib/payments/reservations";
import type { VerifiedPayment } from "../src/lib/contracts/payments";

// This suite creates a failure-injection trigger. Never run against app data.
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
assert.equal(process.env.ALLOW_PAYMENT_INTEGRATION, "1");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55433");
assert.equal(url.pathname, "/review");

async function main() {
  const key = randomUUID();
  const user = await db.user.create({ data: { email: `${key}@example.invalid`, name: "Integration owner" } });
  const business = await db.business.create({ data: { ownerId: user.id, name: "Integration merchant", slug: key, category: "HOME", status: "APPROVED" } });
  const product = await db.product.create({ data: { businessId: business.id, name: "Test gift", priceUSD: 10 } });
  const registry = await db.registry.create({ data: { userId: user.id, title: "Integration registry", slug: key, type: "WEDDING", status: "PUBLISHED" } });
  const orders: string[] = [];
  let passed = 0;
  const done = (name: string) => { passed++; console.log(`PASS ${name}`); };
  async function fixture(itemId?: string) {
    const item = itemId ? await db.registryItem.findUniqueOrThrow({ where: { id: itemId } }) : await db.registryItem.create({ data: {
      registryId: registry.id, title: "Test gift", quantity: 1, priceUSD: 10,
      source: "LOCAL_BUSINESS", productId: product.id, businessId: business.id,
    } });
    const order = await db.order.create({ data: {
      registryId: registry.id, orderNumber: randomUUID(), buyerName: "Test buyer", buyerEmail: "buyer@example.invalid", totalUSD: 10,
      expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date(Date.now() - 3600_000),
      items: { create: { registryItemId: item.id, quantity: 1, priceUSD: 10 } },
      payment: { create: { provider: "PAYPAL", currency: "USD", amountExpected: 10, amountUSD: 10, paypalOrderId: randomUUID(), createdAt: new Date(Date.now() - 3600_000) } },
    } });
    orders.push(order.id);
    const verified: VerifiedPayment = { orderId: order.id, provider: "PAYPAL", providerTxId: randomUUID(), amount: money(10), currency: "USD", status: "COMPLETED", rawSummary: {} };
    return { item, order, verified };
  }
  try {
    const failed = await fixture();
    await db.registryItem.update({ where: { id: failed.item.id }, data: { title: "INJECT_FULFILLMENT_FAILURE" } });
    await db.$executeRawUnsafe(`CREATE FUNCTION review_reject_fulfillment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'INJECT_FULFILLMENT_FAILURE' THEN RAISE EXCEPTION 'injected fulfillment failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER review_fulfillment_failure BEFORE UPDATE ON registry_items FOR EACH ROW EXECUTE FUNCTION review_reject_fulfillment()`);
    await assert.rejects(claimAndFulfill(failed.verified));
    assert.equal((await db.payment.findUniqueOrThrow({ where: { orderId: failed.order.id } })).status, "PENDING");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: failed.order.id } })).status, "PENDING");
    assert.equal((await db.registryItem.findUniqueOrThrow({ where: { id: failed.item.id } })).fulfilledQty, 0);
    assert.equal(await db.emailOutbox.count({ where: { dedupeKey: { startsWith: `order:${failed.order.id}:` } } }), 0);
    await db.$executeRawUnsafe("DROP TRIGGER review_fulfillment_failure ON registry_items");
    await db.$executeRawUnsafe("DROP FUNCTION review_reject_fulfillment()");
    assert.equal(await claimAndFulfill(failed.verified), "fulfilled");
    done("settlement, inventory and emails roll back together; retry succeeds");

    const duplicate = await fixture();
    const outcomes = await Promise.all([claimAndFulfill(duplicate.verified), claimAndFulfill(duplicate.verified)]);
    assert.deepEqual(outcomes.sort(), ["duplicate", "fulfilled"]);
    assert.equal((await db.registryItem.findUniqueOrThrow({ where: { id: duplicate.item.id } })).fulfilledQty, 1);
    assert.equal(await db.emailOutbox.count({ where: { dedupeKey: { startsWith: `order:${duplicate.order.id}:` } } }), 2);
    done("concurrent duplicate payments fulfill and enqueue emails once");

    const reused = await fixture();
    assert.equal(await claimAndFulfill({ ...reused.verified, providerTxId: duplicate.verified.providerTxId }), "duplicate");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: reused.order.id } })).status, "PENDING");
    done("reused provider transaction cannot pay a second order");

    const late = await fixture();
    await db.order.update({ where: { id: late.order.id }, data: { status: "EXPIRED" } });
    const held = await fixture(late.item.id);
    assert.equal(await claimAndFulfill(late.verified), "needs_refund");
    assert.equal(await claimAndFulfill(held.verified), "fulfilled");
    done("late payment cannot steal another buyer's reservation");

    const expired = await fixture();
    await db.order.update({ where: { id: expired.order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expireOrders();
    assert.equal((await db.payment.findUniqueOrThrow({ where: { orderId: expired.order.id } })).status, "FAILED");
    assert((await loadPendingPayments(new Date())).some((p) => p.orderId === expired.order.id));
    assert.equal(await reservePayPalCapture(expired.order.id), false);
    done("expired/failed checkouts remain recoverable but cannot initiate capture");

    const capture = await fixture();
    assert.equal(await reservePayPalCapture(capture.order.id), true);
    await db.order.update({ where: { id: capture.order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expireOrders();
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: capture.order.id } })).status, "PENDING");
    assert.equal(await db.orderItem.count({ where: { orderId: capture.order.id, order: reservationWhere(new Date()) } }), 1);
    assert.equal(await reservePayPalCapture(capture.order.id), true);
    done("uncertain capture persists its reservation past normal expiry and permits retry");

    await releaseVoidedPayPal(capture.order.id);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: capture.order.id } })).status, "PAYMENT_FAILED");
    assert.equal((await db.payment.findUniqueOrThrow({ where: { orderId: capture.order.id } })).captureRequestedAt, null);
    done("authoritatively voided PayPal orders release their holds");

    for (let i = 0; i < 5; i++) {
      const racing = await fixture();
      const [reserved] = await Promise.all([reservePayPalCapture(racing.order.id), expireOrders(new Date(Date.now() + 7200_000))]);
      const state = await db.order.findUniqueOrThrow({ where: { id: racing.order.id } });
      assert.equal(state.status, reserved ? "PENDING" : "EXPIRED");
    }
    done("capture and expiry races never expire a committed capture reservation");

    const historical = await fixture();
    await db.payment.update({ where: { orderId: historical.order.id }, data: { status: "COMPLETED", providerTxId: historical.verified.providerTxId } });
    assert((await loadPendingPayments(new Date())).some((p) => p.orderId === historical.order.id));
    assert.equal(await claimAndFulfill(historical.verified), "fulfilled");
    done("historical completed-but-unfulfilled payments can be repaired");

    await db.payment.update({ where: { orderId: historical.order.id }, data: { createdAt: new Date(Date.now() - 8 * 86_400_000) } });
    const oldCapture = await fixture();
    await reservePayPalCapture(oldCapture.order.id);
    await db.payment.update({ where: { orderId: oldCapture.order.id }, data: { createdAt: new Date(Date.now() - 8 * 86_400_000) } });
    assert((await loadPendingPayments(new Date())).some((p) => p.orderId === oldCapture.order.id));
    done("uncertain captures do not age out of recovery");

    await db.payment.updateMany({ where: { orderId: { in: orders } }, data: { lastReconciledAt: new Date() } });
    const firstFresh = await fixture();
    const secondFresh = await fixture();
    const batch = await loadPendingPayments(new Date(), 10 * 60_000, 1);
    assert.equal(batch[0].orderId, firstFresh.order.id);
    await reconcilePayments(batch, {
      verifiers: { PAYPAL: { provider: "PAYPAL", create: async () => { throw new Error("capture forbidden"); }, verify: async () => ({ ...firstFresh.verified, status: "PENDING" }) } },
      claimAndFulfill,
    });
    assert.equal((await loadPendingPayments(new Date(), 10 * 60_000, 1))[0].orderId, secondFresh.order.id);
    done("reconciliation rotates bounded batches instead of starving newer payments");

    const catalog = { source: "LOCAL_BUSINESS", productId: product.id, businessId: business.id };
    for (const condition of ["deleted", "out_of_stock", "suspended"] as const) {
      await db.product.update({ where: { id: product.id }, data: { inStock: condition !== "out_of_stock", deletedAt: condition === "deleted" ? new Date() : null } });
      await db.business.update({ where: { id: business.id }, data: { status: condition === "suspended" ? "SUSPENDED" : "APPROVED" } });
      await assert.rejects(db.$transaction((tx) => assertCatalogAvailable(tx, [catalog])));
    }
    await db.business.update({ where: { id: business.id }, data: { status: "APPROVED" } });
    await db.product.update({ where: { id: product.id }, data: { inStock: true, deletedAt: null } });
    await db.$transaction((tx) => assertCatalogAvailable(tx, [catalog]));
    done("catalog locks reject deleted/unavailable products and suspended merchants");
    console.log(`${passed} PostgreSQL integration checks passed`);
  } finally {
    await db.$executeRawUnsafe("DROP TRIGGER IF EXISTS review_fulfillment_failure ON registry_items");
    await db.$executeRawUnsafe("DROP FUNCTION IF EXISTS review_reject_fulfillment()");
    await db.emailOutbox.deleteMany({ where: { OR: orders.map((id) => ({ dedupeKey: { startsWith: `order:${id}:` } })) } });
    await db.auditLog.deleteMany({ where: { targetId: { in: orders } } });
    await db.order.deleteMany({ where: { id: { in: orders } } });
    await db.registry.delete({ where: { id: registry.id } });
    await db.business.delete({ where: { id: business.id } });
    await db.user.delete({ where: { id: user.id } });
  }
}

main().catch((err) => { console.error("Payment integration failed:", err instanceof Error ? err.message : "unknown error"); process.exitCode = 1; }).finally(() => db.$disconnect());
