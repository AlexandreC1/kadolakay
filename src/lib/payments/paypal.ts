import { ProviderError, type CreatePaymentInput, type CreatePaymentResult, type PaymentVerifier, type VerifiedPayment, type VerifyRef } from "@/lib/contracts/payments";
import { money, toFixed2, type Currency } from "@/lib/money";
import { providerFetchJson, tokenCache } from "./http";

// PayPal Orders v2 integration. Flow: create (intent CAPTURE) → buyer approves
// on PayPal → our return URL calls verify(), which CAPTURES the order (money
// only moves on capture, review C3) and reports the captured amount.
function baseUrl() {
  return process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

const token = tokenCache(async () => {
  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const { data } = await providerFetchJson<{ access_token?: string; expires_in?: number }>("PAYPAL", `${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!data.access_token) throw new ProviderError("PAYPAL", "AUTH_FAILED");
  return { token: data.access_token, expiresInSec: data.expires_in ?? 300 };
});

interface PayPalCapture {
  id?: string;
  status?: string;
  amount?: { value?: string; currency_code?: string };
}
export interface PayPalOrder {
  id?: string;
  status?: string;
  purchase_units?: { reference_id?: string; payments?: { captures?: PayPalCapture[] } }[];
  links?: { rel: string; href: string }[];
  details?: { issue?: string }[];
}

/** Pure: turn a PayPal order/capture response into a VerifiedPayment. Exported for tests. */
export function verifiedFromPayPalOrder(order: PayPalOrder): VerifiedPayment {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  if (!unit?.reference_id || !capture?.id || !capture.amount?.value || !capture.amount.currency_code) {
    throw new ProviderError("PAYPAL", "BAD_RESPONSE");
  }
  const currency = capture.amount.currency_code as Currency;
  return {
    orderId: unit.reference_id,
    provider: "PAYPAL",
    providerTxId: capture.id,
    providerEventId: `paypal:${capture.id}`,
    amount: money(capture.amount.value),
    currency,
    status: capture.status === "COMPLETED" ? "COMPLETED" : capture.status === "PENDING" ? "PENDING" : "FAILED",
    rawSummary: { paypalOrderId: order.id ?? null, orderStatus: order.status ?? null, captureStatus: capture.status ?? null },
  };
}

export const paypalProvider: PaymentVerifier = {
  provider: "PAYPAL",

  async create(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const { data } = await providerFetchJson<PayPalOrder>("PAYPAL", `${baseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token.get()}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `create-${input.orderId}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.orderId,
            description: input.description,
            amount: { currency_code: input.currency, value: toFixed2(input.amount) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
              brand_name: "KadoLakay",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      }),
    });
    const approve = data.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!data.id || !approve) throw new ProviderError("PAYPAL", "BAD_RESPONSE");
    return { redirectUrl: approve, providerRef: data.id };
  },

  /** Captures the approved order (idempotent via PayPal-Request-Id). */
  async verify(ref: VerifyRef): Promise<VerifiedPayment> {
    const paypalOrderId = ref.providerRef ?? ref.transactionId;
    if (!paypalOrderId || !/^[A-Z0-9]{5,40}$/i.test(paypalOrderId)) throw new ProviderError("PAYPAL", "BAD_RESPONSE");
    const auth = { Authorization: `Bearer ${await token.get()}`, "Content-Type": "application/json" };
    const { status, data } = await providerFetchJson<PayPalOrder>(
      "PAYPAL",
      `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      { method: "POST", headers: { ...auth, "PayPal-Request-Id": `capture-${ref.orderId}` }, body: "{}", allowStatus: [422] }
    );
    if (status === 422) {
      // ORDER_ALREADY_CAPTURED (reload / double click): read the existing capture.
      if (!data.details?.some((d) => d.issue === "ORDER_ALREADY_CAPTURED")) throw new ProviderError("PAYPAL", "NOT_COMPLETED", 422);
      const existing = await providerFetchJson<PayPalOrder>("PAYPAL", `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { headers: auth });
      return verifiedFromPayPalOrder(existing.data);
    }
    return verifiedFromPayPalOrder(data);
  },
};

/** Recovery is read-only. An approved order is not permission for cron to charge. */
export const paypalInspector: PaymentVerifier = {
  ...paypalProvider,
  async verify(ref: VerifyRef): Promise<VerifiedPayment> {
    const id = ref.providerRef ?? ref.transactionId;
    if (!id || !/^[A-Z0-9]{5,40}$/i.test(id)) throw new ProviderError("PAYPAL", "BAD_RESPONSE");
    const { data } = await providerFetchJson<PayPalOrder>("PAYPAL", `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${await token.get()}` },
    });
    if (data.purchase_units?.[0]?.payments?.captures?.length) return verifiedFromPayPalOrder(data);
    return {
      orderId: data.purchase_units?.[0]?.reference_id ?? "",
      provider: "PAYPAL", providerTxId: id, amount: money(0), currency: "USD",
      status: data.status === "VOIDED" ? "FAILED" : "PENDING",
      rawSummary: { paypalOrderId: id, orderStatus: data.status ?? null },
    };
  },
};

export const _testing = { token };
