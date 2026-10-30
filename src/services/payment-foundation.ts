import { z } from "zod";

export const merchantProviderSchema = z.enum(["moncash", "natcash", "card"]);
/** Future adapters must verify signatures/server evidence themselves, never browser returns. */
export const merchantPaymentRequestSchema = z
  .object({
    orderId: z.string().min(1).max(100),
    merchantId: z.string().min(1).max(100),
    merchantRecipient: z.string().min(1).max(200),
    currency: z.enum(["USD", "HTG"]),
    amountMinor: z.number().int().positive().max(999999999999),
    idempotencyKey: z.string().min(16).max(100),
  })
  .strict();
export type MerchantPaymentRequest = z.infer<
  typeof merchantPaymentRequestSchema
>;
export interface MerchantPaymentAdapter {
  create(
    request: MerchantPaymentRequest,
  ): Promise<{ reference: string; redirectUrl: string }>;
  inspect(
    reference: string,
  ): Promise<{
    state: "pending" | "paid" | "failed";
    orderId: string;
    merchantRecipient: string;
    amountMinor: number;
    currency: "USD" | "HTG";
  }>;
}
export function assertPaymentEvidence(
  request: MerchantPaymentRequest,
  evidence: Awaited<ReturnType<MerchantPaymentAdapter["inspect"]>>,
) {
  merchantPaymentRequestSchema.parse(request);
  if (
    evidence.state !== "paid" ||
    evidence.orderId !== request.orderId ||
    evidence.merchantRecipient !== request.merchantRecipient ||
    evidence.currency !== request.currency ||
    !Number.isSafeInteger(evidence.amountMinor) ||
    evidence.amountMinor !== request.amountMinor
  )
    throw new Error("PAYMENT_EVIDENCE_MISMATCH");
}
/** No live adapter is registered until merchant-direct settlement is provider-verified.
 * This is intentionally independent of legacy sandbox Stripe and never calls it. */
export async function createMerchantPayment(
  request: MerchantPaymentRequest,
): Promise<never> {
  merchantPaymentRequestSchema.parse(request);
  throw new Error("MERCHANT_PAYMENT_NOT_CONFIGURED");
}
