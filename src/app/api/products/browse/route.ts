import { NextResponse } from "next/server";
import { parsePageRequest, parseSearch } from "@/lib/pagination";
import { browseProducts } from "@/lib/queries/browse";

/**
 * GET /api/products/browse?q=&cursor=&take=  (max take 50)
 * Response: { items: Product[], nextCursor: string | null }.
 * Do not let shared caches retain products from a suspended merchant.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = parsePageRequest({ cursor: sp.get("cursor"), take: sp.get("take") });
  const q = parseSearch(sp.get("q"));
  const result = await browseProducts(page, q);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
