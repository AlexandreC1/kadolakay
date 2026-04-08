export type PaymentProviderType = "stripe" | "paypal" | "moncash" | "natcash";

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  currency: "HTG" | "USD";
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreatePaymentResult {
  redirectUrl?: string;
  clientSecret?: string;
  providerRef?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  providerRef: string;
  rawResponse: unknown;
}

export interface PaymentProviderInterface {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  verifyPayment(params: {
    transactionId?: string;
    orderId?: string;
  }): Promise<VerifyPaymentResult>;
}

// Static imports — Next.js tree-shaking removes any provider not actually
// referenced from a route, so we don't need (and can't use) CommonJS require
// here. Lint forbids it and ESM doesn't have a sync equivalent.
import { stripeProvider } from "./stripe";
import { paypalProvider } from "./paypal";
import { moncashProvider } from "./moncash";
import { natcashProvider } from "./natcash";

const PROVIDERS: Record<PaymentProviderType, PaymentProviderInterface> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
  moncash: moncashProvider,
  natcash: natcashProvider,
};

export function getPaymentProvider(
  provider: PaymentProviderType
): PaymentProviderInterface {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown payment provider: ${provider}`);
  return p;
}
