import type {
  PaymentProviderInterface,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
} from "./index";

// PayPal REST API integration
const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

export const paypalProvider: PaymentProviderInterface = {
  async createPayment(
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    const token = await getAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: params.orderId,
            description: params.description,
            amount: {
              currency_code: params.currency,
              value: params.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          brand_name: "KadoLakay",
        },
      }),
    });

    const data = await response.json();
    const approveLink = data.links?.find(
      (l: { rel: string }) => l.rel === "approve"
    );

    return {
      redirectUrl: approveLink?.href,
      providerRef: data.id,
    };
  },

  async verifyPayment(params): Promise<VerifyPaymentResult> {
    const token = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${params.transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return {
      success: data.status === "COMPLETED",
      providerRef: data.id,
      rawResponse: data,
    };
  },
};
