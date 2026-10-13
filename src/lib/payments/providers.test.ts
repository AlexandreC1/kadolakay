import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { paypalProvider, verifiedFromPayPalOrder, _testing } from "./paypal";
import { verifiedFromMonCash, moncashProvider } from "./moncash";
import { verifiedFromStripeSession } from "./stripe";
import { natcashProvider } from "./natcash";
import { money } from "@/lib/money";
import type Stripe from "stripe";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const capturedOrder = {
  id: "PAYPAL123", status: "COMPLETED",
  purchase_units: [{ reference_id: "ord_1", payments: { captures: [{ id: "CAP1", status: "COMPLETED", amount: { value: "60.07", currency_code: "USD" } }] } }],
};

describe("PayPal (C3)", () => {
  beforeEach(() => _testing.token.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("maps a capture to a VerifiedPayment", () => {
    const v = verifiedFromPayPalOrder(capturedOrder);
    expect(v).toMatchObject({ orderId: "ord_1", providerTxId: "CAP1", currency: "USD", status: "COMPLETED" });
    expect(v.amount.equals(money("60.07"))).toBe(true);
  });
  it("an APPROVED-but-not-captured order is never COMPLETED", () => {
    expect(() => verifiedFromPayPalOrder({ id: "X", status: "APPROVED", purchase_units: [{ reference_id: "o" }] })).toThrow();
  });
  it("verify() POSTs the capture endpoint with an idempotency key", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(200, { access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(json(201, capturedOrder));
    vi.stubGlobal("fetch", fetchMock);
    const v = await paypalProvider.verify({ orderId: "ord_1", providerRef: "PAYPAL123" });
    expect(v.status).toBe("COMPLETED");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/v2\/checkout\/orders\/PAYPAL123\/capture$/);
    expect(init.method).toBe("POST");
    expect(init.headers["PayPal-Request-Id"]).toBe("capture-ord_1");
  });
  it("ORDER_ALREADY_CAPTURED on reload reads the existing capture", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(200, { access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(json(422, { details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }))
      .mockResolvedValueOnce(json(200, capturedOrder));
    vi.stubGlobal("fetch", fetchMock);
    const v = await paypalProvider.verify({ orderId: "ord_1", providerRef: "PAYPAL123" });
    expect(v.providerTxId).toBe("CAP1");
  });
  it("HTTP errors become ProviderError without the body", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(200, { access_token: "t", expires_in: 3600 }))
      .mockResolvedValueOnce(json(500, { secret: "do-not-leak" })));
    await expect(paypalProvider.verify({ orderId: "o", providerRef: "PAYPAL123" })).rejects.toMatchObject({ code: "HTTP_ERROR", message: "PAYPAL:HTTP_ERROR:500" });
  });
  it("rejects malformed tokens before calling PayPal", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    await expect(paypalProvider.verify({ orderId: "o", providerRef: "../../x" })).rejects.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
});

describe("MonCash (C4)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("takes the order id from MonCash's reference, not from the caller", () => {
    const v = verifiedFromMonCash({ payment: { reference: "ord_9", transaction_id: 12345, cost: 1500, message: "successful" } });
    expect(v).toMatchObject({ orderId: "ord_9", providerTxId: "12345", currency: "HTG", status: "COMPLETED" });
    expect(v.amount.toFixed(2)).toBe("1500.00");
  });
  it("non-successful transactions are FAILED; malformed responses throw", () => {
    expect(verifiedFromMonCash({ payment: { reference: "o", transaction_id: 1, cost: 1, message: "failed" } }).status).toBe("FAILED");
    expect(() => verifiedFromMonCash({})).toThrow();
  });
  it("refuses non-HTG payments", async () => {
    await expect(moncashProvider.create({ orderId: "o", publicToken: "p", amount: money(1), currency: "USD", description: "", returnUrl: "https://x", cancelUrl: "https://x" })).rejects.toMatchObject({ code: "UNSUPPORTED_CURRENCY" });
  });
});

describe("Stripe (M4)", () => {
  const session = (o: Partial<Stripe.Checkout.Session>) =>
    ({ id: "cs_1", metadata: { orderId: "ord_1" }, amount_total: 6007, currency: "usd", payment_intent: "pi_1", payment_status: "paid", status: "complete", ...o }) as Stripe.Checkout.Session;
  it("maps a paid session", () => {
    const v = verifiedFromStripeSession(session({}), "evt_1");
    expect(v).toMatchObject({ orderId: "ord_1", providerTxId: "pi_1", providerEventId: "evt_1", currency: "USD", status: "COMPLETED" });
    expect(v.amount.toFixed(2)).toBe("60.07");
  });
  it("complete-but-unpaid (delayed method) is PENDING, not fulfilled", () => {
    expect(verifiedFromStripeSession(session({ payment_status: "unpaid" })).status).toBe("PENDING");
  });
  it("missing metadata throws", () => {
    expect(() => verifiedFromStripeSession(session({ metadata: {} }))).toThrow();
  });
});

describe("Natcash", () => {
  it("never auto-completes and puts no amount in the URL", async () => {
    await expect(natcashProvider.verify({ orderId: "o" })).rejects.toMatchObject({ code: "NOT_COMPLETED" });
    const r = await natcashProvider.create({ orderId: "o", publicToken: "p", amount: money(10), currency: "HTG", description: "", returnUrl: "https://k.com/r/s/checkout/success?t=p", cancelUrl: "https://k.com" });
    expect(r.redirectUrl).toBe("https://k.com/r/s/checkout/success?t=p&provider=natcash");
  });
});
