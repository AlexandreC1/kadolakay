import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import { previewSharedRegistry } from "@/services/registry-finder";
import { searchPublicRegistries } from "@/services/baskets-privacy";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const querySchema = z.strictObject({ q: z.string().trim().min(2).max(500) });

/**
 * Live list finder for the home page.
 * An exact shared link or address opens that list (same rules as /find). A name only
 * matches lists their owner opted into search. Nothing else about other lists is revealed.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success || [...params.keys()].length !== 1)
    return NextResponse.json({ error: "INVALID_SEARCH" }, { status: 400, headers });
  const limit = await checkRateLimit("general", `registry-live-search:${rateLimitClientKey(request.headers)}`);
  if (!limit.ok)
    return NextResponse.json({ error: limit.unavailable ? "UNAVAILABLE" : "RATE_LIMITED" }, { status: limit.unavailable ? 503 : 429, headers });
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const q = parsed.data.q;
    const [direct, named] = await Promise.all([
      previewSharedRegistry(q, base),
      q.length <= 80 ? searchPublicRegistries({ q }) : Promise.resolve({ items: [], next: null }),
    ]);
    const exact = direct.status === "found" ? direct.registry : null;
    const results = named.items
      .filter((r) => r.slug !== exact?.slug)
      .slice(0, 6)
      .map((r) => ({ slug: r.slug, title: r.title, type: r.type, eventDate: r.eventDate, owner: r.user?.name ?? null }));
    return NextResponse.json(
      {
        exact: exact ? { slug: exact.slug, title: exact.title, type: exact.type, eventDate: exact.eventDate, giftCount: exact.giftCount } : null,
        results,
      },
      { headers },
    );
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
