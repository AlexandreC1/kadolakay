import type { PaymentVerifier, Provider } from "@/lib/contracts/payments";
import { getFlags } from "@/lib/contracts/flags";
import { stripeProvider } from "./stripe";
import { paypalProvider } from "./paypal";
import { moncashProvider } from "./moncash";
import { natcashProvider } from "./natcash";

export type PaymentProviderType = "stripe" | "paypal" | "moncash" | "natcash";

const PROVIDERS: Record<PaymentProviderType, PaymentVerifier> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
  moncash: moncashProvider,
  natcash: natcashProvider,
};

/** Currency each provider charges in. Stripe/PayPal: USD; MonCash/Natcash: HTG. */
export const PROVIDER_CURRENCY = { stripe: "USD", paypal: "USD", moncash: "HTG", natcash: "HTG" } as const;

export function providerEnum(p: PaymentProviderType): Provider {
  return p.toUpperCase() as Provider;
}

/**
 * The current integrations settle to a platform account, not an individual
 * merchant. Allow sandbox rehearsals only until merchant settlement is built.
 * A feature flag alone must never turn on a live money flow.
 */
export function isSandboxCheckout(p: PaymentProviderType, env: NodeJS.ProcessEnv = process.env): boolean {
  switch (p) {
    case "stripe": return /^sk_test_/.test(env.STRIPE_SECRET_KEY ?? "");
    case "paypal": return env.PAYPAL_MODE === "sandbox";
    case "moncash": return env.MONCASH_MODE === "sandbox";
    case "natcash": return false;
  }
}

export function isProviderEnabled(p: PaymentProviderType, flags = getFlags(), env: NodeJS.ProcessEnv = process.env): boolean {
  return isSandboxCheckout(p, env) && {
    stripe: flags.stripeEnabled,
    paypal: flags.paypalEnabled,
    moncash: flags.moncashEnabled,
    natcash: flags.natcashEnabled,
  }[p];
}

export function getPaymentProvider(provider: PaymentProviderType): PaymentVerifier {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown payment provider: ${provider}`);
  return p;
}
