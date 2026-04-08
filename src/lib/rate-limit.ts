/**
 * Edge-safe rate limiting via Upstash Redis.
 *
 * Designed to no-op gracefully when UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN are not set, so local dev and CI don't need a
 * Redis instance. In production those env vars MUST be configured or every
 * request will be allowed (a warning is logged once at startup).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let warnedAboutMissingConfig = false;
function warnOnce() {
  if (warnedAboutMissingConfig) return;
  warnedAboutMissingConfig = true;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN are not set — rate limiting is DISABLED in production. Configure Upstash before going live."
    );
  }
}

const redis = url && token ? new Redis({ url, token }) : null;

function makeLimiter(label: string, limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    prefix: `kadolakay:rl:${label}`,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
  });
}

const auth = makeLimiter("auth", 5, "1 m");
const webhook = makeLimiter("webhook", 100, "1 m");
const checkout = makeLimiter("checkout", 10, "1 m");
const general = makeLimiter("general", 60, "1 m");

export type LimiterKind = "auth" | "webhook" | "checkout" | "general";

const limiters: Record<LimiterKind, Ratelimit | null> = {
  auth,
  webhook,
  checkout,
  general,
};

export type RateLimitResult =
  | { ok: true; remaining: number; reset: number; limit: number }
  | { ok: false; remaining: number; reset: number; limit: number };

/**
 * Check whether `identifier` (typically the client IP, or `userId:action`)
 * is allowed under the named limiter. Returns ok=true and a no-op result
 * when Upstash is not configured.
 */
export async function checkRateLimit(
  kind: LimiterKind,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = limiters[kind];
  if (!limiter) {
    warnOnce();
    return { ok: true, remaining: Infinity as unknown as number, reset: 0, limit: 0 };
  }
  const r = await limiter.limit(identifier);
  return {
    ok: r.success,
    remaining: r.remaining,
    reset: r.reset,
    limit: r.limit,
  };
}
