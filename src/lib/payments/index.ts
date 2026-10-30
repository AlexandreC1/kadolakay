export type PaymentProviderType = "stripe" | "paypal" | "moncash" | "natcash";

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  currency: "HTG" | "USD";
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiresAt?: number;
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

/** Retired platform-owned adapters are not a merchant-direct payment service.
 * Keep type compatibility for historical modules, but fail closed if reused.
 * New integrations must implement services/payment-foundation.ts. */
export function getPaymentProvider(provider: PaymentProviderType): never {
  void provider;
  throw new Error("LEGACY_PAYMENT_ADAPTER_DISABLED");
}
