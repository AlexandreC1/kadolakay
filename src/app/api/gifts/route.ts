import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoverySchema, discoveryWhere } from "@/lib/gift-discovery";
import { parsePageRequest, cursorArgs, toPage } from "@/lib/pagination";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const parsed = discoverySchema.safeParse({
    currency: query.get("currency") ?? "HTG",
    budget: query.get("budget") || undefined,
    occasion: query.get("occasion") ?? "ALL",
    q: query.get("q") || undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const filter = parsed.data;
  const page = parsePageRequest({ cursor: query.get("cursor"), take: 24 });
  const price = filter.currency === "USD" ? "priceUSD" : "priceHTG";
  try {
    const rows = await db.product.findMany({
      where: {
        ...discoveryWhere(filter),
        [price]: {
          not: null,
          gte: 0,
          ...(filter.budget !== undefined ? { lte: filter.budget } : {}),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        priceHTG: true,
        priceUSD: true,
        business: { select: { name: true } },
      },
      orderBy: [{ [price]: "asc" }, { id: "asc" }],
      ...cursorArgs(page),
    });
    const result = toPage(rows, page.take);
    return NextResponse.json(
      {
        nextCursor: result.nextCursor,
        items: result.items.map((product) => ({
          id: product.id,
          name: product.name,
          businessName: product.business.name,
          price: (filter.currency === "USD"
            ? product.priceUSD
            : product.priceHTG)!.toFixed(2),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
