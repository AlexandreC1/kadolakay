import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ auth: vi.fn(), headers: vi.fn(), limit: vi.fn(), resume: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: state.auth }));
vi.mock("next/headers", () => ({ headers: state.headers }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: state.limit }));
vi.mock("@/services/checkout", () => ({ resumeCheckout: state.resume, beginCheckout: vi.fn(), CheckoutError: class CheckoutError extends Error {} }));
import { resumeOrder } from "./checkout";
describe("guest checkout limiting", () => {
  beforeEach(() => { vi.resetAllMocks(); state.auth.mockResolvedValue(null); state.limit.mockResolvedValue({ ok: true }); state.resume.mockResolvedValue({ redirectUrl: "https://checkout.stripe.com/test" }); });
  afterEach(() => vi.unstubAllEnvs());
  it("ignores attacker forwarding headers and uses only the host-owned IP", async () => {
    vi.stubEnv("NETLIFY", "true");
    state.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "198.51.100.1", "x-nf-client-connection-ip": "192.0.2.1" }));
    await resumeOrder({ checkoutRequestId: "1e36ed21-6cbc-4eb8-b575-420ead1a434b", registrySlug: "test-list" });
    expect(state.limit).toHaveBeenCalledWith("checkout", "ip:192.0.2.1");
    state.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "198.51.100.2" }));
    await resumeOrder({ checkoutRequestId: "1e36ed21-6cbc-4eb8-b575-420ead1a434b", registrySlug: "test-list" });
    expect(state.limit).toHaveBeenLastCalledWith("checkout", "ip:unverified-client");
  });
  it("never reaches payment services after limiter refusal", async () => {
    state.headers.mockResolvedValue(new Headers()); state.limit.mockResolvedValue({ ok: false });
    expect(await resumeOrder({})).toEqual({ error: "RATE_LIMITED" });
    expect(state.resume).not.toHaveBeenCalled();
  });
});
