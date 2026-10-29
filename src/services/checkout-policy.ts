/** Haiti marketplace launch: this legacy platform Stripe flow is sandbox-only.
 * Merchant-direct settlement is not implemented. Recovery remains independent. */
export function checkoutConfigured(env: Record<string, string | undefined> = process.env) {
  return env.CHECKOUT_ENABLED === "true" && env.PAYMENT_MODE === "sandbox" && Boolean(env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
}

export function supportsNativeCheckout(item: { source: string; productId: string | null; businessId: string | null }) {
  return item.source === "LOCAL_BUSINESS" && Boolean(item.productId && item.businessId);
}
