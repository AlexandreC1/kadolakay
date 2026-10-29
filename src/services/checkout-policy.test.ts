import { describe, it, expect } from "vitest";
import { checkoutConfigured, supportsNativeCheckout } from "./checkout-policy";

describe("checkout launch boundaries", () => {
  const credentials = { STRIPE_SECRET_KEY: "sk_test_example", STRIPE_WEBHOOK_SECRET: "whsec_example" };
  it("does not start collecting money just because keys were provisioned", () => {
    expect(checkoutConfigured(credentials)).toBe(false);
    expect(checkoutConfigured({ ...credentials, CHECKOUT_ENABLED: "false" })).toBe(false);
    expect(checkoutConfigured({ ...credentials, CHECKOUT_ENABLED: "true" })).toBe(false);
    expect(checkoutConfigured({ ...credentials, CHECKOUT_ENABLED: "true", PAYMENT_MODE: "sandbox" })).toBe(true);
    expect(checkoutConfigured({ CHECKOUT_ENABLED: "true" })).toBe(false);
  });
  it("cannot charge live money into the platform account for merchant-owned sales", () => {
    for (const PAYMENT_MODE of [undefined, "sandbox", "live"]) {
      expect(checkoutConfigured({ CHECKOUT_ENABLED: "true", PAYMENT_MODE, STRIPE_SECRET_KEY: "sk_live_example", STRIPE_WEBHOOK_SECRET: "whsec_example" })).toBe(false);
    }
  });
  it("rejects manual cash-like gifts and external purchases without a seller contract", () => {
    for (const source of ["CUSTOM", "EXTERNAL", "AMAZON"]) {
      expect(supportsNativeCheckout({ source, productId: null, businessId: null })).toBe(false);
    }
    expect(supportsNativeCheckout({ source: "LOCAL_BUSINESS", productId: null, businessId: "merchant" })).toBe(false);
    expect(supportsNativeCheckout({ source: "LOCAL_BUSINESS", productId: "product", businessId: "merchant" })).toBe(true);
  });
});
