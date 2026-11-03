import { db } from "@/lib/db";
import { z } from "zod";

export const selectionSchema = z
  .object({
    registryId: z.string().min(1).max(128),
    productIds: z.array(z.string().min(1).max(128)).min(1).max(50),
  })
  .strict();

export class SelectionError extends Error {
  constructor(public code: "unavailable" | "forbidden" | "limit") {
    super(code);
  }
}

/** Wishlist selection does not reserve stock or take payment. All-or-nothing insertion. */
export async function saveRegistrySelection(
  userId: string,
  input: z.infer<typeof selectionSchema>,
) {
  const ids = [...new Set(input.productIds)];
  return db.$transaction(
    async (tx) => {
      // Serialize concurrent adds for this registry, including double-click/retry requests.
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM registries WHERE id = ${input.registryId} AND "userId" = ${userId} FOR UPDATE`;
      if (!rows.length) throw new SelectionError("forbidden");
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { bannedAt: true, deletedAt: true },
      });
      if (!user || user.bannedAt || user.deletedAt)
        throw new SelectionError("forbidden");
      const registry = await tx.registry.findUnique({
        where: { id: input.registryId },
        select: { slug: true, status: true },
      });
      if (!registry || registry.status === "ARCHIVED")
        throw new SelectionError("forbidden");
      const products = await tx.product.findMany({
        where: {
          id: { in: ids },
          inStock: true,
          deletedAt: null,
          business: {
            status: "APPROVED",
            owner: { bannedAt: null, deletedAt: null },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          priceHTG: true,
          priceUSD: true,
          businessId: true,
        },
      });
      if (products.length !== ids.length)
        throw new SelectionError("unavailable");
      const existing = await tx.registryItem.findMany({
        where: { registryId: input.registryId, productId: { in: ids } },
        select: { productId: true },
      });
      const present = new Set(existing.map((item) => item.productId));
      const fresh = products.filter((product) => !present.has(product.id));
      const count = await tx.registryItem.count({
        where: { registryId: input.registryId },
      });
      if (count + fresh.length > 500) throw new SelectionError("limit");
      if (fresh.length)
        await tx.registryItem.createMany({
          data: fresh.map((product) => ({
            registryId: input.registryId,
            productId: product.id,
            businessId: product.businessId,
            title: product.name,
            description: product.description,
            imageUrl: product.imageUrl,
            priceHTG: product.priceHTG,
            priceUSD: product.priceUSD,
            source: "LOCAL_BUSINESS",
            quantity: 1,
          })),
        });
      return {
        added: fresh.length,
        existing: present.size,
        slug: registry.slug,
      };
    },
    { maxWait: 5000, timeout: 10000 },
  );
}
