/**
 * Rate limiting via Upstash Redis (edge-safe).
 *
 * Unconfigured behaviour:
 *  - development / test: allow (no Redis needed locally or in CI)
 *  - production: DENY auth / magic-link / checkout (fail closed, review M2) unless
 *    RATE_LIMIT_ALLOW_UNCONFIGURED=1 is set explicitly (e.g. a throwaway preview).
 *    Webhooks (signature-verified) and general traffic stay allowed so a
 *    misconfiguration can't drop paid orders. env.ts also refuses to boot without it.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

type Window = `${number} ${"s" | "m" | "h"}`;
function makeLimiter(label: string, limit: number, window: Window) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    prefix: `kadolakay:rl:${label}`,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
  });
}

export const LIMITS = {
  // POST sign-in / callback per IP. Session/CSRF GETs are NOT limited (they fire on every page).
  auth: [10, "1 m"],
  // Magic-link emails per address.
  magicLink: [3, "15 m"],
  webhook: [100, "1 m"],
  checkout: [10, "1 m"],
  general: [60, "1 m"],
} as const satisfies Record<string, readonly [number, Window]>;

export type LimiterKind = keyof typeof LIMITS;

const limiters = Object.fromEntries(
  Object.entries(LIMITS).map(([k, [n, w]]) => [k, makeLimiter(k, n, w)])
) as Record<LimiterKind, Ratelimit | null>;

export type RateLimitResult = { ok: boolean; remaining: number; reset: number; limit: number };

let warned = false;
const STRICT_KINDS: readonly LimiterKind[] = ["auth", "magicLink", "checkout"];

export function unconfiguredResult(kind: LimiterKind, env: NodeJS.ProcessEnv = process.env): RateLimitResult {
  const failClosed =
    STRICT_KINDS.includes(kind) && env.NODE_ENV === "production" && env.RATE_LIMIT_ALLOW_UNCONFIGURED !== "1";
  if (!warned) {
    warned = true;
    if (env.NODE_ENV === "production") {
      console.error(
        `[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN missing: ${env.RATE_LIMIT_ALLOW_UNCONFIGURED === "1" ? "rate limiting DISABLED (override)" : "DENYING auth/checkout requests"}`
      );
    }
  }
  return { ok: !failClosed, remaining: 0, reset: Date.now() + 60_000, limit: 0 };
}

export async function checkRateLimit(kind: LimiterKind, identifier: string): Promise<RateLimitResult> {
  const limiter = limiters[kind];
  if (!limiter) return unconfiguredResult(kind);
  try {
    const r = await limiter.limit(identifier);
    return { ok: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
  } catch {
    // Redis outage: keep the site up for normal traffic, but protect auth/payments.
    return { ok: !STRICT_KINDS.includes(kind), remaining: 0, reset: Date.now() + 60_000, limit: 0 };
  }
}

/**
 * Client IP we can trust (review M2). On Vercel, x-vercel-forwarded-for /
 * x-real-ip are set by the platform. The FIRST X-Forwarded-For entry is
 * whatever the client sent, so we only ever use the LAST hop (added by the
 * proxy in front of us).
 */
export function getClientIp(h: Headers): string {
  const vercel = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").map((s) => s.trim()).filter(Boolean).pop();
    if (last) return last;
  }
  return "anon";
}
