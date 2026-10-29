import { ProviderError, type CreatePaymentInput, type CreatePaymentResult, type PaymentVerifier, type VerifiedPayment } from "@/lib/contracts/payments";

// Natcash: manual flow until NATCOM opens a merchant API. The buyer is sent to
// our own success page (keyed by the order's publicToken) which shows the
// merchant number; an admin confirms receipt (WS5 → confirmManualPayment).
// No amount or order id travels in the URL (review M8).
export const natcashProvider: PaymentVerifier = {
  provider: "NATCASH",

  async create(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.currency !== "HTG") throw new ProviderError("NATCASH", "UNSUPPORTED_CURRENCY");
    const url = new URL(input.returnUrl);
    url.searchParams.set("provider", "natcash");
    return { redirectUrl: url.toString(), providerRef: input.orderId };
  },

  async verify(ref): Promise<VerifiedPayment> {
    // Never auto-completes: only an admin can confirm a Natcash payment.
    void ref;
    throw new ProviderError("NATCASH", "NOT_COMPLETED");
  },
};
