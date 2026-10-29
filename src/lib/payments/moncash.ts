import { ProviderError, type CreatePaymentInput, type CreatePaymentResult, type PaymentVerifier, type VerifiedPayment, type VerifyRef } from "@/lib/contracts/payments";
import { money, toFixed2 } from "@/lib/money";
import { providerFetchJson, tokenCache } from "./http";

// MonCash (Digicel) REST API. The buyer is redirected back to the return URL
// configured in the MonCash merchant portal (→ /api/webhooks/moncash) with
// ?transactionId=…; we then retrieve the transaction and check that its
// `reference` is OUR order id and `cost` is the amount we expected (review C4).
function baseUrl() {
  return process.env.MONCASH_MODE === "live"
    ? "https://moncashbutton.digicelgroup.com"
    : "https://sandbox.moncashbutton.digicelgroup.com";
}
function apiUrl(path: string) {
  return `${baseUrl()}/Api${path}`;
}

const token = tokenCache(async () => {
  const credentials = Buffer.from(`${process.env.MONCASH_CLIENT_ID}:${process.env.MONCASH_CLIENT_SECRET}`).toString("base64");
  const { data } = await providerFetchJson<{ access_token?: string; expires_in?: number }>("MONCASH", apiUrl("/oauth/token"), {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: "grant_type=client_credentials&scope=read,write",
  });
  if (!data.access_token) throw new ProviderError("MONCASH", "AUTH_FAILED");
  return { token: data.access_token, expiresInSec: data.expires_in ?? 59 };
});

export interface MonCashRetrieveResponse {
  payment?: { reference?: string | number; transaction_id?: string | number; cost?: number | string; message?: string };
}

/** Pure mapping, exported for tests. MonCash is HTG-only. */
export function verifiedFromMonCash(data: MonCashRetrieveResponse): VerifiedPayment {
  const p = data.payment;
  if (!p || p.reference === undefined || p.transaction_id === undefined || p.cost === undefined) {
    throw new ProviderError("MONCASH", "BAD_RESPONSE");
  }
  return {
    orderId: String(p.reference),
    provider: "MONCASH",
    providerTxId: String(p.transaction_id),
    providerEventId: `moncash:${p.transaction_id}`,
    amount: money(p.cost),
    currency: "HTG",
    status: String(p.message).toLowerCase() === "successful" ? "COMPLETED" : "FAILED",
    rawSummary: { message: p.message ?? null },
  };
}

export const moncashProvider: PaymentVerifier = {
  provider: "MONCASH",

  async create(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.currency !== "HTG") throw new ProviderError("MONCASH", "UNSUPPORTED_CURRENCY");
    const { data } = await providerFetchJson<{ payment_token?: { token?: string } }>("MONCASH", apiUrl("/v1/CreatePayment"), {
      method: "POST",
      headers: { Authorization: `Bearer ${await token.get()}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ amount: Number(toFixed2(input.amount)), orderId: input.orderId }),
    });
    const paymentToken = data.payment_token?.token;
    if (!paymentToken) throw new ProviderError("MONCASH", "BAD_RESPONSE");
    return {
      redirectUrl: `${baseUrl()}/Moncash-middleware/Payment/Redirect?token=${encodeURIComponent(paymentToken)}`,
      providerRef: paymentToken,
    };
  },

  /**
   * By transactionId (the return URL) or, without one, by our orderId
   * (RetrieveOrderPayment). The second form is what reconcile uses when the
   * buyer paid but never came back through the return URL. "No payment for
   * this order yet" comes back as PENDING, not an error.
   */
  async verify(ref: VerifyRef): Promise<VerifiedPayment> {
    if (ref.transactionId) {
      if (!/^[A-Za-z0-9-]{1,64}$/.test(ref.transactionId)) throw new ProviderError("MONCASH", "BAD_RESPONSE");
      const { data } = await providerFetchJson<MonCashRetrieveResponse>("MONCASH", apiUrl("/v1/RetrieveTransactionPayment"), {
        method: "POST",
        headers: { Authorization: `Bearer ${await token.get()}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ transactionId: ref.transactionId }),
      });
      return verifiedFromMonCash(data);
    }
    if (!ref.orderId || !/^[A-Za-z0-9_-]{1,64}$/.test(ref.orderId)) throw new ProviderError("MONCASH", "BAD_RESPONSE");
    const { status, data } = await providerFetchJson<MonCashRetrieveResponse>("MONCASH", apiUrl("/v1/RetrieveOrderPayment"), {
      method: "POST",
      headers: { Authorization: `Bearer ${await token.get()}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ orderId: ref.orderId }),
      allowStatus: [404],
    });
    if (status === 404 || !data.payment?.transaction_id) return notPaidYet(ref.orderId);
    return verifiedFromMonCash(data);
  },
};

function notPaidYet(orderId: string): VerifiedPayment {
  return { orderId, provider: "MONCASH", providerTxId: "", amount: money(0), currency: "HTG", status: "PENDING", rawSummary: { found: false } };
}
