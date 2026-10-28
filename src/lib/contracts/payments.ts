/**
 * Payment verification contract (plan §4.2). Implemented by WS1.
 *
 * Every provider is reduced to create() + verify(). verify() returns what the
 * PROVIDER says happened; claimAndFulfill() (src/lib/orders.ts, WS1) compares
 * it to what WE expected (Payment.amountExpected, currency, orderId) and only
 * then claims (provider, providerTxId) and fulfills the order.
 */
import type { Money, Currency } from "../money";

export type Provider = "STRIPE" | "PAYPAL" | "MONCASH" | "NATCASH";

export interface CreatePaymentInput {
  orderId: string;
  /** Order.publicToken, used to build success/instruction URLs. */
  publicToken: string;
  amount: Money;
  currency: Currency;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreatePaymentResult {
  redirectUrl: string;
  /** Provider-side reference stored on Payment (session id, PayPal order id, MonCash token). */
  providerRef: string;
}

export type VerifiedStatus = "COMPLETED" | "PENDING" | "FAILED";

export interface VerifiedPayment {
  orderId: string;
  provider: Provider;
  /** Settled transaction id: PayPal capture id, MonCash transactionId, Stripe payment_intent. */
  providerTxId: string;
  /** Delivery/event id when the provider has one (Stripe event.id). */
  providerEventId?: string;
  amount: Money;
  currency: Currency;
  status: VerifiedStatus;
  /** Redacted summary safe to persist (no names, emails, phone numbers). */
  rawSummary: Record<string, string | number | boolean | null>;
}

export interface VerifyRef {
  orderId: string;
  providerRef?: string;
  transactionId?: string;
}

export interface PaymentVerifier {
  readonly provider: Provider;
  create(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verify(ref: VerifyRef): Promise<VerifiedPayment>;
}

/** needs_refund: the payment was claimed but the items were already fully gifted (order NEEDS_REFUND). */
export type ClaimOutcome = "fulfilled" | "duplicate" | "rejected" | "needs_refund";

/** Implemented in src/lib/orders.ts (WS1). */
export type ClaimAndFulfill = (verified: VerifiedPayment) => Promise<ClaimOutcome>;

/** Admin confirmation of a manual (Natcash) payment. Implemented by WS1, used by WS5. */
export type ConfirmManualPayment = (input: {
  orderId: string;
  reference: string;
  adminId: string;
}) => Promise<ClaimOutcome>;

export type ProviderErrorCode =
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "BAD_RESPONSE"
  | "AUTH_FAILED"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "ORDER_MISMATCH"
  | "NOT_COMPLETED"
  | "UNSUPPORTED_CURRENCY"
  | "DISABLED";

/** Never carries the provider's response body (may contain PII/secrets). */
export class ProviderError extends Error {
  constructor(
    public readonly provider: Provider,
    public readonly code: ProviderErrorCode,
    public readonly httpStatus?: number
  ) {
    super(`${provider}:${code}${httpStatus ? `:${httpStatus}` : ""}`);
    this.name = "ProviderError";
  }
}

/**
 * Pure check shared by every implementation of claimAndFulfill: does what the
 * provider reports match what we expected? Returns the first mismatch or null.
 */
export function verificationMismatch(
  verified: Pick<VerifiedPayment, "orderId" | "amount" | "currency" | "status">,
  expected: { orderId: string; amount: Money; currency: Currency }
): ProviderErrorCode | null {
  if (verified.status !== "COMPLETED") return "NOT_COMPLETED";
  if (verified.orderId !== expected.orderId) return "ORDER_MISMATCH";
  if (verified.currency !== expected.currency) return "CURRENCY_MISMATCH";
  if (!verified.amount.equals(expected.amount)) return "AMOUNT_MISMATCH";
  return null;
}
