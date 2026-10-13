/**
 * Public catalogue queries (WS7), cached with tag `browse` (see docs/cache-tags.md).
 * Anything that changes a business or product must call revalidateTag("browse").
 */
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cursorArgs, toPage, type PageRequest } from "@/lib/pagination";

export const BROWSE_TAG = "browse";
export const BUSINESSES_PAGE_SIZE = 24;

async function loadBusinesses(page: PageRequest) {
  const rows = await db.business.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      city: true,
      description: true,
      logoUrl: true,
      coverUrl: true,
      products: {
        where: { inStock: true, deletedAt: null },
        select: { id: true, name: true, imageUrl: true },
        take: 4,
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    ...cursorArgs(page),
  });
  return toPage(rows, page.take);
}

export const getBrowseBusinesses = unstable_cache(loadBusinesses, ["browse-businesses"], {
  tags: [BROWSE_TAG],
  revalidate: 300,
});

export function productSearchWhere(q?: string): Prisma.ProductWhereInput {
  return {
    inStock: true,
    deletedAt: null,
    business: { status: "APPROVED" },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { business: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function browseProducts(page: PageRequest, q?: string) {
  const rows = await db.product.findMany({
    where: productSearchWhere(q),
    select: {
      id: true,
      name: true,
      description: true,
      priceHTG: true,
      priceUSD: true,
      imageUrl: true,
      businessId: true,
      business: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    ...cursorArgs(page),
  });
  const p = toPage(rows, page.take);
  return {
    nextCursor: p.nextCursor,
    items: p.items.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      priceHTG: r.priceHTG ? Number(r.priceHTG) : null,
      priceUSD: r.priceUSD ? Number(r.priceUSD) : null,
      imageUrl: r.imageUrl,
      businessId: r.businessId,
      businessName: r.business.name,
    })),
  };
}
