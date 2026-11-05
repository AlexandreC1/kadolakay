/**
 * Feature flags (plan §2). Read from env at call time so tests can toggle them.
 * Payment providers default off until explicitly enabled and verified. Queue off.
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
    stripeEnabled: flag("STRIPE_ENABLED", false, env),
    paypalEnabled: flag("PAYPAL_ENABLED", false, env),
    moncashEnabled: flag("MONCASH_ENABLED", false, env),
    natcashEnabled: flag("NATCASH_ENABLED", false, env),
    emailQueueEnabled: flag("EMAIL_QUEUE_ENABLED", false, env),
    maintenanceMode: flag("MAINTENANCE_MODE", false, env),
  };
}
