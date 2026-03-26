import Stripe from "stripe";
import type {
  PaymentProviderInterface,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "./index";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
      success_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        orderId: params.orderId,
      },
    });

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
