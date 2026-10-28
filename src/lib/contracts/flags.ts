/**
 * Feature flags (plan §2). Read from env at call time so tests can toggle them.
 * Defaults: Stripe, PayPal and MonCash on; Natcash OFF until the admin screen
 * that confirms manual transfers (confirmManualPayment) exists, otherwise
 * buyers would send money that nobody can mark as received. Queue off.
 */
export interface Flags {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  moncashEnabled: boolean;
  natcashEnabled: boolean;
  emailQueueEnabled: boolean;
  maintenanceMode: boolean;
}

function flag(name: string, fallback: boolean, env: NodeJS.ProcessEnv): boolean {
  const v = env[name];
  if (v === undefined || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export function getFlags(env: NodeJS.ProcessEnv = process.env): Flags {
  return {
    stripeEnabled: flag("STRIPE_ENABLED", true, env),
    paypalEnabled: flag("PAYPAL_ENABLED", true, env),
    moncashEnabled: flag("MONCASH_ENABLED", true, env),
    natcashEnabled: flag("NATCASH_ENABLED", false, env),
    emailQueueEnabled: flag("EMAIL_QUEUE_ENABLED", false, env),
    maintenanceMode: flag("MAINTENANCE_MODE", false, env),
  };
}
