import type {
  PaymentProviderInterface,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "./index";

// Natcash - manual payment flow for MVP
// Users send payment to the platform's Natcash number and provide the transaction reference
// Full API integration to be added when NATCOM merchant API access is established

export const natcashProvider: PaymentProviderInterface = {
  async createPayment(
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    if (params.currency !== "HTG") {
      throw new Error("Natcash only supports HTG currency");
    }

    // For MVP: redirect to a page that shows Natcash payment instructions
    const instructionUrl = new URL(params.returnUrl);
    instructionUrl.searchParams.set("provider", "natcash");
    instructionUrl.searchParams.set("orderId", params.orderId);
    instructionUrl.searchParams.set("amount", params.amount.toString());
    instructionUrl.searchParams.set(
      "natcashNumber",
      process.env.NATCASH_MERCHANT_NUMBER || ""
    );

    return {
      redirectUrl: instructionUrl.toString(),
      providerRef: params.orderId,
    };
  },

  async verifyPayment(params): Promise<VerifyPaymentResult> {
    // MVP: manual verification — admin confirms payment received
    // TODO: Integrate Natcash API when available
    return {
      success: false, // Requires manual confirmation
      providerRef: params.transactionId || params.orderId || "",
      rawResponse: { status: "PENDING_MANUAL_VERIFICATION" },
    };
  },
};
