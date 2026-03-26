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

export function getPaymentProvider(
  provider: PaymentProviderType
): PaymentProviderInterface {
  switch (provider) {
    case "stripe":
      // Lazy import to avoid loading all providers
      return require("./stripe").stripeProvider;
    case "paypal":
      return require("./paypal").paypalProvider;
    case "moncash":
      return require("./moncash").moncashProvider;
    case "natcash":
      return require("./natcash").natcashProvider;
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
