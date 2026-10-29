import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
export type LimiterKind = "auth" | "webhook" | "checkout" | "general";
export type RateLimitResult = { ok: boolean; remaining: number; reset: number; limit: number; unavailable?: boolean };
const limits: Record<LimiterKind, number> = { auth: 10, webhook: 300, checkout: 10, general: 60 };
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const limiters = Object.fromEntries(Object.entries(limits).map(([kind, limit]) => [kind,
  redis ? new Ratelimit({ redis, prefix: `kadolakay:rl:${kind}`, limiter: Ratelimit.slidingWindow(limit, "1 m"), analytics: false }) : null,
])) as Record<LimiterKind, Ratelimit | null>;
// Development only. Production requires a shared store across instances.
const local = new Map<string, { count: number; reset: number }>();
export async function checkRateLimit(kind: LimiterKind, identifier: string): Promise<RateLimitResult> {
  const limit = limits[kind];
  const limiter = limiters[kind];
  if (limiter) {
    try {
      const r = await limiter.limit(identifier);
      return { ok: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
    } catch {
      return { ok: false, unavailable: true, remaining: 0, reset: Date.now() + 60_000, limit };
    }
  }
  if (process.env.NODE_ENV === "production") return { ok: false, unavailable: true, remaining: 0, reset: Date.now() + 60_000, limit };
  const now = Date.now();
  const key = `${kind}:${identifier.slice(0, 200)}`;
  const current = local.get(key);
  const bucket = current && current.reset > now ? current : { count: 0, reset: now + 60_000 };
  if (!current || current.reset <= now) {
    for (const [id, entry] of local) if (entry.reset <= now) local.delete(id);
    if (local.size >= 10_000) return { ok: false, remaining: 0, reset: now + 60_000, limit };
    local.set(key, bucket);
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), reset: bucket.reset, limit };
}
