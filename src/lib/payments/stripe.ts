import Stripe from "stripe";
import type {
  PaymentProviderInterface,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "./index";

// Lazy singleton — `new Stripe()` throws if STRIPE_SECRET_KEY is unset,
// which breaks `next build` page-data collection in CI/preview environments
// where the secret isn't provisioned.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("PAYMENTS_UNAVAILABLE");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
  }
  return _stripe;
}
// Backwards-compat proxy so existing `stripe.checkout.sessions.create(...)` /
// `stripe.webhooks.constructEvent(...)` call sites continue to work without
// edits — every property access goes through the lazy initializer.
const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return Reflect.get(getStripe(), prop, getStripe());
  },
});

export const stripeProvider: PaymentProviderInterface = {
  async createPayment(
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: params.description,
            },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      expires_at: params.expiresAt ?? Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        orderId: params.orderId,
      },
    }, { idempotencyKey: `checkout:${params.orderId}` });

    return {
      redirectUrl: session.url ?? undefined,
      providerRef: session.id,
    };
  },

  async verifyPayment(params): Promise<VerifyPaymentResult> {
    const session = await stripe.checkout.sessions.retrieve(
      params.transactionId!
    );
    return {
      success: session.payment_status === "paid",
      providerRef: session.id,
      rawResponse: session,
    };
  },
};

export { stripe };
