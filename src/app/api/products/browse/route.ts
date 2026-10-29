import { NextResponse } from "next/server";
import { getPublicProducts } from "@/services/catalog";
export async function GET() {
  try {
    return NextResponse.json(await getPublicProducts(), { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "The gift catalog is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}
