import { describe, expect, it } from "vitest";
import { isProviderEnabled, isSandboxCheckout, type PaymentProviderType } from "./index";
import { getFlags } from "@/lib/contracts/flags";

const allEnabled = getFlags({ NODE_ENV: "test", STRIPE_ENABLED: "1", PAYPAL_ENABLED: "1", MONCASH_ENABLED: "1", NATCASH_ENABLED: "1" });
describe("merchant settlement launch guard", () => {
  it.each<PaymentProviderType>(["stripe", "paypal", "moncash", "natcash"])("does not enable %s with missing configuration", (provider) => {
    expect(isProviderEnabled(provider, allEnabled, { NODE_ENV: "test" })).toBe(false);
  });
  it("blocks live provider configurations even with all flags enabled", () => {
    const env = { NODE_ENV: "test" as const, STRIPE_SECRET_KEY: "sk_live_example", PAYPAL_MODE: "live", MONCASH_MODE: "live" };
    for (const provider of ["stripe", "paypal", "moncash", "natcash"] as const) expect(isProviderEnabled(provider, allEnabled, env)).toBe(false);
  });
  it("permits only explicitly enabled test configurations", () => {
    const env = { NODE_ENV: "test" as const, STRIPE_SECRET_KEY: "sk_test_example", PAYPAL_MODE: "sandbox", MONCASH_MODE: "sandbox" };
    expect(isProviderEnabled("stripe", allEnabled, env)).toBe(true);
    expect(isProviderEnabled("paypal", allEnabled, env)).toBe(true);
    expect(isProviderEnabled("moncash", allEnabled, env)).toBe(true);
    expect(isProviderEnabled("natcash", allEnabled, env)).toBe(false);
    expect(isProviderEnabled("stripe", getFlags({ NODE_ENV: "test" }), env)).toBe(false);
  });
  it("does not infer sandbox mode from a missing provider mode", () => {
    expect(isSandboxCheckout("paypal", { NODE_ENV: "test" })).toBe(false);
    expect(isSandboxCheckout("moncash", { NODE_ENV: "test" })).toBe(false);
  });
});
