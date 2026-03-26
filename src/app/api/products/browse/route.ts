import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const products = await db.product.findMany({
    where: {
      inStock: true,
      business: { status: "APPROVED" },
    },
    include: {
      business: { select: { name: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceHTG: p.priceHTG ? Number(p.priceHTG) : null,
      priceUSD: p.priceUSD ? Number(p.priceUSD) : null,
      imageUrl: p.imageUrl,
      businessId: p.businessId,
      businessName: p.business.name,
    }))
  );
}
