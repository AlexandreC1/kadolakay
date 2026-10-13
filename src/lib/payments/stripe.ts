import Stripe from "stripe";
import { ProviderError, type CreatePaymentInput, type CreatePaymentResult, type PaymentVerifier, type VerifiedPayment, type VerifyRef } from "@/lib/contracts/payments";
import { fromMinorUnits, toMinorUnits, type Currency } from "@/lib/money";

// Lazy singleton — `new Stripe()` throws if STRIPE_SECRET_KEY is unset,
// which breaks `next build` page-data collection in CI/preview environments.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_build_placeholder");
  return _stripe;
}
const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return Reflect.get(getStripe(), prop, getStripe());
  },
});

/** Pure mapping from a Checkout Session (webhook payload or retrieve) — review M4. */
export function verifiedFromStripeSession(session: Stripe.Checkout.Session, eventId?: string): VerifiedPayment {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.amount_total == null || !session.currency) throw new ProviderError("STRIPE", "BAD_RESPONSE");
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  return {
    orderId,
    provider: "STRIPE",
    providerTxId: intent ?? session.id,
    providerEventId: eventId,
    amount: fromMinorUnits(session.amount_total),
    currency: session.currency.toUpperCase() as Currency,
    // `complete` + `unpaid` happens for delayed methods: wait for async_payment_succeeded.
    status: session.payment_status === "paid" ? "COMPLETED" : session.status === "expired" ? "FAILED" : "PENDING",
    rawSummary: { sessionId: session.id, paymentStatus: session.payment_status, status: session.status ?? null },
  };
}

export const stripeProvider: PaymentVerifier = {
  provider: "STRIPE",

  async create(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.currency !== "USD") throw new ProviderError("STRIPE", "UNSUPPORTED_CURRENCY");
    const session = await stripe.checkout.sessions.create(
      {
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: input.description },
              unit_amount: toMinorUnits(input.amount),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId },
        payment_intent_data: { metadata: { orderId: input.orderId } },
        // Minimum allowed by Stripe is 30 min; matches Order.expiresAt (2h).
        expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      },
      { idempotencyKey: `checkout-${input.orderId}` }
    );
    if (!session.url) throw new ProviderError("STRIPE", "BAD_RESPONSE");
    return { redirectUrl: session.url, providerRef: session.id };
  },

  async verify(ref: VerifyRef): Promise<VerifiedPayment> {
    const id = ref.providerRef ?? ref.transactionId;
    if (!id) throw new ProviderError("STRIPE", "BAD_RESPONSE");
    return verifiedFromStripeSession(await stripe.checkout.sessions.retrieve(id));
  },
};

export { stripe };
