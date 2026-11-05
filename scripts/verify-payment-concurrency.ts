import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
  assert(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "55438" && url.pathname === "/kdom_concurrency_test", "Refusing to run outside the dedicated disposable database");
  const { db } = await import("../src/lib/db");
  const { claimAndFulfill } = await import("../src/lib/orders");
  const { money } = await import("../src/lib/money");
  const suffix = randomUUID();
  try {
    const owner = await db.user.create({ data: { email: `owner-${suffix}@example.invalid`, name: "Test owner" } });
    const registry = await db.registry.create({ data: { userId: owner.id, slug: `test-${suffix}`, title: "Test registry", type: "BIRTHDAY", status: "PUBLISHED" } });
    const item = await db.registryItem.create({ data: { registryId: registry.id, title: "One gift", quantity: 1, priceUSD: "25.00" } });
    async function makeOrder(label: string, itemId = item.id) {
      return db.order.create({ data: { orderNumber: `${label}-${suffix}`, registryId: registry.id, buyerName: "Test buyer", buyerEmail: `buyer-${suffix}@example.invalid`, totalUSD: "25.00", items: { create: [{ registryItemId: itemId, quantity: 1, priceUSD: "25.00" }] }, payment: { create: { provider: "STRIPE", currency: "USD", amountUSD: "25.00", amountExpected: "25.00" } } } });
    }
    const first = await makeOrder("first");
    const event = { orderId: first.id, provider: "STRIPE" as const, providerTxId: `tx-${suffix}`, providerEventId: `evt-${suffix}`, amount: money("25"), currency: "USD" as const, status: "COMPLETED" as const, rawSummary: {} };
    const duplicates = await Promise.all(Array.from({ length: 8 }, () => claimAndFulfill(event)));
    assert.equal(duplicates.filter((r) => r === "fulfilled").length, 1, "one duplicate delivery should fulfill");
    assert.equal((await db.registryItem.findUniqueOrThrow({ where: { id: item.id } })).fulfilledQty, 1);
    assert.equal(await db.emailOutbox.count({ where: { dedupeKey: { startsWith: `order:${first.id}:` } } }), 2);
    const second = await makeOrder("late");
    const late = await claimAndFulfill({ ...event, orderId: second.id, providerTxId: `tx2-${suffix}`, providerEventId: `evt2-${suffix}` });
    assert.equal(late, "needs_refund", "late paid order must not over-fulfill");
    assert.equal((await db.registryItem.findUniqueOrThrow({ where: { id: item.id } })).fulfilledQty, 1);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: second.id } })).status, "NEEDS_REFUND");
    const invalid = await makeOrder("wrong-amount");
    const rejected = await claimAndFulfill({ ...event, orderId: invalid.id, providerTxId: `wrong-tx-${suffix}`, providerEventId: `wrong-event-${suffix}`, amount: money("0.01") });
    assert.equal(rejected, "rejected");
    assert.equal((await db.payment.findUniqueOrThrow({ where: { orderId: invalid.id } })).status, "PENDING");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: invalid.id } })).status, "PENDING");
    const contested = await db.registryItem.create({ data: { registryId: registry.id, title: "Contested gift", quantity: 1, priceUSD: "25.00" } });
    const [a, b] = await Promise.all([makeOrder("race-a", contested.id), makeOrder("race-b", contested.id)]);
    const simultaneous = await Promise.all([a, b].map((order, i) => claimAndFulfill({ ...event, orderId: order.id, providerTxId: `race-tx-${i}-${suffix}`, providerEventId: `race-event-${i}-${suffix}` })));
    assert.deepEqual(simultaneous.slice().sort(), ["fulfilled", "needs_refund"]);
    assert.equal((await db.registryItem.findUniqueOrThrow({ where: { id: contested.id } })).fulfilledQty, 1);
    console.log("PostgreSQL payment checks passed: concurrent replay, competing payments, amount mismatch, single fulfillment, deduplicated emails, late-payment refund state.");
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
