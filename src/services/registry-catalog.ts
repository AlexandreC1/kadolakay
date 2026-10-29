import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { Prisma } from "@prisma/client";
import { catalogSelectionSchema } from "@/lib/validators/registry-catalog";
import { toMinorUnits } from "./money";

export type CatalogSelectionErrorCode = "INVALID_SELECTION" | "REGISTRY_UNAVAILABLE" | "GIFT_ALREADY_ADDED" | "PRODUCT_UNAVAILABLE";
export class CatalogSelectionError extends Error {
  constructor(public readonly code: CatalogSelectionErrorCode) { super(code); }
}

export async function addCatalogGift(actorId: string, registryId: string, productId: string) {
  return addCatalogGifts(actorId, { registryId, productIds: [productId] });
}

/** One selection is all-or-nothing. Catalog facts always come from locked rows. */
export async function addCatalogGifts(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const parsed = catalogSelectionSchema.safeParse(input);
  if (!parsed.success) throw new CatalogSelectionError("INVALID_SELECTION");
  const { registryId } = parsed.data;
  const productIds = [...parsed.data.productIds].sort();
  return db.$transaction(async tx => {
    // Serialize duplicate additions and archive/publish against the same registry row.
    await tx.$queryRaw`SELECT id FROM registries WHERE id = ${registryId} AND "userId" = ${actorId} FOR UPDATE`;
    const registry = await tx.registry.findFirst({ where: { id: registryId, userId: actorId, status: { not: "ARCHIVED" } }, select: { id: true } });
    if (!registry) throw new CatalogSelectionError("REGISTRY_UNAVAILABLE");
    if (await tx.registryItem.findFirst({ where: { registryId, productId: { in: productIds } }, select: { id: true } })) throw new CatalogSelectionError("GIFT_ALREADY_ADDED");
    // Approval, availability and prices cannot change partway through the snapshot.
    await tx.$queryRaw(Prisma.sql`SELECT p.id FROM products p JOIN businesses b ON b.id = p."businessId" WHERE p.id IN (${Prisma.join(productIds)}) ORDER BY p.id FOR SHARE OF p, b`);
    const products = await tx.product.findMany({ where: { id: { in: productIds }, inStock: true, business: { status: "APPROVED" } }, orderBy: { id: "asc" }, select: { id: true, name: true, description: true, imageUrl: true, priceHTG: true, priceUSD: true, businessId: true } });
    if (products.length !== productIds.length) throw new CatalogSelectionError("PRODUCT_UNAVAILABLE");
    for (const product of products) {
      const prices = [product.priceHTG, product.priceUSD].filter(price => price !== null);
      try {
        if (!prices.length || prices.some(price => toMinorUnits(price) > 999999999)) throw new Error("INVALID_PRICE");
      } catch { throw new CatalogSelectionError("PRODUCT_UNAVAILABLE"); }
    }
    const created = await tx.registryItem.createMany({ data: products.map(product => ({ registryId, title: product.name, description: product.description, imageUrl: product.imageUrl, priceHTG: product.priceHTG, priceUSD: product.priceUSD, source: "LOCAL_BUSINESS", businessId: product.businessId, productId: product.id })) });
    return { addedCount: created.count };
  }, { maxWait: 15000, timeout: 15000 });
}
