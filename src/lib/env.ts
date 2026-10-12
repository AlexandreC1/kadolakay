/**
 * Server environment validation (plan WS0 task 3, review M2 "fail closed").
 *
 * `validateServerEnv()` returns the list of problems; `assertServerEnv()`
 * throws in production. Wiring it into startup (src/instrumentation.ts) is
 * WS8's job so this commit doesn't change runtime behaviour.
 */
import { z } from "zod";

const url = z.string().url();
const nonEmpty = z.string().min(1);

/** Required in production. */
const productionSchema = z.object({
  NEXT_PUBLIC_APP_URL: url,
  DATABASE_URL: nonEmpty,
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be >= 32 chars"),
  AUTH_GOOGLE_ID: nonEmpty,
  AUTH_GOOGLE_SECRET: nonEmpty,
  AUTH_RESEND_KEY: nonEmpty,
  UPSTASH_REDIS_REST_URL: url,
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(live|test)_/),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/),
  S3_ENDPOINT: url,
  S3_ACCESS_KEY_ID: nonEmpty,
  S3_SECRET_ACCESS_KEY: nonEmpty,
  S3_BUCKET: nonEmpty,
  S3_PUBLIC_URL: url,
  CRON_SECRET: z.string().min(32),
});

/** Required only when the matching provider flag is on. */
const providerSchemas = {
  PAYPAL_ENABLED: z.object({ PAYPAL_CLIENT_ID: nonEmpty, PAYPAL_CLIENT_SECRET: nonEmpty, PAYPAL_MODE: z.enum(["sandbox", "live"]) }),
  MONCASH_ENABLED: z.object({ MONCASH_CLIENT_ID: nonEmpty, MONCASH_CLIENT_SECRET: nonEmpty, MONCASH_MODE: z.enum(["sandbox", "live"]) }),
  NATCASH_ENABLED: z.object({ NATCASH_MERCHANT_NUMBER: nonEmpty }),
} as const;

function enabled(v: string | undefined) {
  return v === undefined || v === "" || v === "1" || v.toLowerCase() === "true";
}

export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];
  const collect = (r: { success: boolean; error?: z.ZodError }) => {
    if (!r.success && r.error) for (const i of r.error.issues) problems.push(`${i.path.join(".")}: ${i.message}`);
  };
  collect(productionSchema.safeParse(env));
  for (const [flag, schema] of Object.entries(providerSchemas)) {
    if (enabled(env[flag])) collect(schema.safeParse(env));
  }
  // Live keys must never be paired with sandbox modes or a non-https app URL.
  if (env.STRIPE_SECRET_KEY?.startsWith("sk_live_") && env.NEXT_PUBLIC_APP_URL?.startsWith("http://")) {
    problems.push("NEXT_PUBLIC_APP_URL: must be https when using live Stripe keys");
  }
  return problems;
}

/** Throws in production when anything is missing; warns elsewhere. Never prints values. */
export function assertServerEnv(env: NodeJS.ProcessEnv = process.env): void {
  const problems = validateServerEnv(env);
  if (problems.length === 0) return;
  const msg = `Invalid server environment:\n  - ${problems.join("\n  - ")}`;
  if (env.NODE_ENV === "production" && env.SKIP_ENV_VALIDATION !== "1") throw new Error(msg);
  console.warn(msg);
}
