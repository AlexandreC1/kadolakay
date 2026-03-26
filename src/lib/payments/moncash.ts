import type {
  PaymentProviderInterface,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "./index";

// MonCash API integration
// Docs: https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/resources/doc/RestAPI_MonCash_doc.pdf

const MONCASH_BASE_URL =
  process.env.MONCASH_MODE === "live"
    ? "https://moncashbutton.digicelgroup.com"
    : "https://sandbox.moncashbutton.digicelgroup.com";

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MONCASH_CLIENT_ID}:${process.env.MONCASH_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${MONCASH_BASE_URL}/Api/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=read,write",
  });

  const data = await response.json();
  return data.access_token;
}

export const moncashProvider: PaymentProviderInterface = {
  async createPayment(
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    if (params.currency !== "HTG") {
      throw new Error("MonCash only supports HTG currency");
    }

    const token = await getAccessToken();

    const response = await fetch(
      `${MONCASH_BASE_URL}/Api/v1/CreatePayment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: params.amount,
          orderId: params.orderId,
        }),
      }
    );

    const data = await response.json();
    const paymentToken = data.payment_token?.token;

    return {
      redirectUrl: `${MONCASH_BASE_URL}/Moncash-business/Payment/Redirect?token=${paymentToken}`,
      providerRef: paymentToken,
    };
  },

  async verifyPayment(params): Promise<VerifyPaymentResult> {
    const token = await getAccessToken();

    const response = await fetch(
      `${MONCASH_BASE_URL}/Api/v1/RetrieveTransactionPayment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: params.transactionId,
        }),
      }
    );

    const data = await response.json();
    return {
      success: data.transaction?.status === "COMPLETED",
      providerRef: data.transaction?.transactionId || "",
      rawResponse: data,
    };
  },
};
