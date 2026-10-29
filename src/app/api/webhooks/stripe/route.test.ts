import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";
const client = vi.hoisted(() => ({ fulfill: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/orders", () => ({ fulfillOrder: client.fulfill }));
vi.mock("@/services/checkout", () => ({ releaseCheckout: client.release }));
import { POST } from "./route";
const secret = "whsec_local_test_only";
function request(payload: unknown, valid = true) {
  const body = JSON.stringify(payload);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: valid ? secret : "whsec_wrong" });
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", { method: "POST", body, headers: { "stripe-signature": signature } });
}
describe("Stripe signed webhook boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.STRIPE_SECRET_KEY = "sk_test_local_only"; process.env.STRIPE_WEBHOOK_SECRET = secret; });
  it("rejects forged signatures without invoking business logic", async () => {
    expect((await POST(request({ type: "checkout.session.completed" }, false))).status).toBe(400);
    expect(client.fulfill).not.toHaveBeenCalled();
  });
  it("does not fulfill an unpaid completion event", async () => {
    expect((await POST(request({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "unpaid", metadata: { orderId: "order1" } } } }))).status).toBe(200);
    expect(client.fulfill).not.toHaveBeenCalled();
  });
  it("passes signed amount and currency evidence to fulfillment", async () => {
    const response = await POST(request({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", amount_total: 1999, currency: "usd", metadata: { orderId: "order1" } } } }));
    expect(response.status).toBe(200); expect(client.fulfill).toHaveBeenCalledWith("order1", { sessionId: "cs_test_1", eventId: "evt_1", amountMinor: 1999, currency: "usd" });
  });
  it("returns retryable failure when fulfillment cannot commit", async () => {
    client.fulfill.mockRejectedValueOnce(new Error("DB_DOWN"));
    expect((await POST(request({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", metadata: { orderId: "order1" } } } }))).status).toBe(500);
  });
  it("releases a hold only for a verified expiration event", async () => {
    expect((await POST(request({ id: "evt_2", type: "checkout.session.expired", data: { object: { id: "cs_test_1", metadata: { orderId: "order1" } } } }))).status).toBe(200);
    expect(client.release).toHaveBeenCalledWith("order1");
  });
});
