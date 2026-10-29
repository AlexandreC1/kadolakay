import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { directorySchema, type DirectoryInput } from "@/lib/directory";
import { optionalWebUrl } from "@/lib/validators/shared";
export const DIRECTORY_PAGE_SIZE = 12;

/** Bounded keyset pages. Never load the entire merchant catalog into the homepage. */
export async function browseBusinessDirectory(input: DirectoryInput) {
  const { q, category, after } = directorySchema.parse(input);
  const literal = q.replace(/[\\%_]/g, "\\$&");
  const where: Prisma.BusinessWhereInput = {
    status: "APPROVED",
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(q ? { OR: [{ name: { contains: literal, mode: "insensitive" } }, { city: { contains: literal, mode: "insensitive" } }] } : {}),
  };
  let boundary: Prisma.BusinessWhereInput = {};
  if (after) {
    const cursor = await db.business.findFirst({ where: { AND: [where, { id: after }] }, select: { id: true, name: true } });
    if (!cursor) return { status: "expired", items: [], next: null } as const;
    boundary = { OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }] };
  }
  const rows = await db.business.findMany({
    where: { AND: [where, boundary] }, take: DIRECTORY_PAGE_SIZE + 1,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, slug: true, category: true, city: true, description: true, coverUrl: true,
      _count: { select: { products: { where: { inStock: true } } } },
      products: { where: { inStock: true }, take: 3, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } },
    },
  });
  const items = rows.slice(0, DIRECTORY_PAGE_SIZE).map(row => ({ id: row.id, name: row.name, slug: row.slug, category: row.category, city: row.city, description: row.description, products: row.products.map(product => ({ id: product.id, name: product.name })), productCount: row._count.products, coverUrl: row.coverUrl && optionalWebUrl.safeParse(row.coverUrl).success ? row.coverUrl : null }));
  return { status: "ready", items, next: rows.length > DIRECTORY_PAGE_SIZE ? items.at(-1)!.id : null } as const;
}
