import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { money } from "@/lib/money";

const m = vi.hoisted(() => ({ find: vi.fn(), inspect: vi.fn(), capture: vi.fn(), reserve: vi.fn(), release: vi.fn(), claim: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { payment: { findFirst: m.find } } }));
vi.mock("@/lib/payments/paypal", () => ({ paypalInspector: { verify: m.inspect }, paypalProvider: { verify: m.capture } }));
vi.mock("@/lib/payments/reservations", () => ({ reservePayPalCapture: m.reserve, releaseVoidedPayPal: m.release }));
vi.mock("@/lib/orders", () => ({ claimAndFulfill: m.claim, getOrderRedirectTarget: async () => "/r/test/checkout/success?t=test" }));
import { GET } from "./route";

const verified = () => ({ orderId: "order1", provider: "PAYPAL", providerTxId: "CAP1", amount: money(10), currency: "USD", status: "COMPLETED", rawSummary: {} });
const request = () => new NextRequest("https://example.invalid/api/webhooks/paypal?token=PAYPAL123");
beforeEach(() => {
  vi.resetAllMocks();
  m.find.mockResolvedValue({ orderId: "order1", status: "PENDING" });
  m.inspect.mockResolvedValue(verified());
  m.reserve.mockResolvedValue(true);
  m.capture.mockResolvedValue(verified());
  m.claim.mockResolvedValue("fulfilled");
});

it("repairs an already completed local payment without capturing again", async () => {
  m.find.mockResolvedValue({ orderId: "order1", status: "COMPLETED" });
  const response = await GET(request());
  expect(m.claim).toHaveBeenCalledOnce();
  expect(m.capture).not.toHaveBeenCalled();
  expect(m.reserve).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toContain("/checkout/success");
});
it("does not capture when the persisted reservation cannot be acquired", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { orderStatus: "APPROVED" } });
  m.reserve.mockResolvedValue(false);
  expect((await GET(request())).headers.get("location")).toContain("payment=unavailable");
  expect(m.capture).not.toHaveBeenCalled();
});
it("persists the reservation before initiating capture", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { orderStatus: "APPROVED" } });
  await GET(request());
  expect(m.reserve.mock.invocationCallOrder[0]).toBeLessThan(m.capture.mock.invocationCallOrder[0]);
  expect(m.claim).toHaveBeenCalledOnce();
});
it("does not release a reservation after an uncertain capture timeout", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { orderStatus: "APPROVED" } });
  m.capture.mockRejectedValue(new Error("timeout"));
  expect((await GET(request())).headers.get("location")).toContain("payment=error");
  expect(m.release).not.toHaveBeenCalled();
  expect(m.claim).not.toHaveBeenCalled();
});
it("rejects an order mismatch before any capture", async () => {
  m.inspect.mockResolvedValue({ ...verified(), orderId: "different" });
  expect((await GET(request())).headers.get("location")).toContain("payment=failed");
  expect(m.reserve).not.toHaveBeenCalled();
  expect(m.capture).not.toHaveBeenCalled();
});
it("releases a hold only after PayPal reports VOIDED", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "FAILED", rawSummary: { orderStatus: "VOIDED" } });
  expect((await GET(request())).headers.get("location")).toContain("payment=failed");
  expect(m.release).toHaveBeenCalledWith("order1");
  expect(m.capture).not.toHaveBeenCalled();
});
it("does not reserve or capture an unapproved provider order", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { orderStatus: "CREATED" } });
  expect((await GET(request())).headers.get("location")).toContain("payment=unavailable");
  expect(m.reserve).not.toHaveBeenCalled();
  expect(m.capture).not.toHaveBeenCalled();
});
it("does not capture again while a previous capture is pending", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { orderStatus: "COMPLETED", captureStatus: "PENDING" } });
  expect((await GET(request())).headers.get("location")).toContain("/checkout/success");
  expect(m.reserve).not.toHaveBeenCalled();
  expect(m.capture).not.toHaveBeenCalled();
  expect(m.claim).not.toHaveBeenCalled();
});
it("waits for settlement when a newly submitted capture is pending", async () => {
  m.inspect.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { orderStatus: "APPROVED" } });
  m.capture.mockResolvedValue({ ...verified(), status: "PENDING", rawSummary: { captureStatus: "PENDING" } });
  expect((await GET(request())).headers.get("location")).toContain("/checkout/success");
  expect(m.reserve).toHaveBeenCalled();
  expect(m.claim).not.toHaveBeenCalled();
});
