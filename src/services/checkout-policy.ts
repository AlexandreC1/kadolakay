/** New purchases require explicit operator opt-in. Webhooks/recovery must keep running when disabled. */
export function checkoutConfigured(env: Record<string, string | undefined> = process.env) {
  return env.CHECKOUT_ENABLED === "true" && Boolean(env.STRIPE_SECRET_KEY?.match(/^sk_(test|live)_/) && env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
}

export function supportsNativeCheckout(item: { source: string; productId: string | null; businessId: string | null }) {
  return item.source === "LOCAL_BUSINESS" && Boolean(item.productId && item.businessId);
}
