import { NextResponse } from "next/server";
import { parsePageRequest, parseSearch } from "@/lib/pagination";
import { browseProducts } from "@/lib/queries/browse";

/**
 * GET /api/products/browse?q=&cursor=&take=  (max take 50)
 * Response: { items: Product[], nextCursor: string | null }.
 * Public catalogue data only, so it is CDN-cached.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = parsePageRequest({ cursor: sp.get("cursor"), take: sp.get("take") });
  const q = parseSearch(sp.get("q"));
  const result = await browseProducts(page, q);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
