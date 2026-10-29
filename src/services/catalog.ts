import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { entitySlugSchema, parseEntityId } from "@/lib/validators/entity-id";
import { optionalWebUrl } from "@/lib/validators/shared";
const safeImage = (url: string | null) => url && optionalWebUrl.safeParse(url).success ? url : null;
const productSelect = { id: true, name: true, description: true, category: true, priceHTG: true, priceUSD: true, imageUrl: true, inStock: true } as const;
export async function listHomepageBusinesses() {
  return db.business.findMany({ where: { status: "APPROVED" }, select: { id: true, name: true, slug: true, city: true, category: true }, take: 3, orderBy: [{ name: "asc" }, { id: "asc" }] });
}
function serializeProduct<T extends { imageUrl: string | null; priceHTG: unknown; priceUSD: unknown }>(product: T) {
  return { ...product, imageUrl: safeImage(product.imageUrl), priceHTG: product.priceHTG === null ? null : Number(product.priceHTG), priceUSD: product.priceUSD === null ? null : Number(product.priceUSD) };
}
export async function listApprovedBusinesses() {
  const businesses = await db.business.findMany({ where: { status: "APPROVED" }, take: 60, select: {
    id: true, name: true, slug: true, category: true, city: true, description: true, coverUrl: true, logoUrl: true,
    products: { where: { inStock: true }, take: 4, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, imageUrl: true } },
  }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  return businesses.map(business => ({ ...business, coverUrl: safeImage(business.coverUrl), logoUrl: safeImage(business.logoUrl), products: business.products.map(product => ({ ...product, imageUrl: safeImage(product.imageUrl) })) }));
}
export async function findPublicBusiness(slug: string) {
  const parsed = entitySlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const business = await db.business.findFirst({ where: { slug: parsed.data, status: "APPROVED" }, select: {
    id: true, name: true, slug: true, description: true, category: true, city: true, department: true, logoUrl: true, coverUrl: true,
    products: { where: { inStock: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 100, select: productSelect },
  } });
  return business ? { ...business, logoUrl: safeImage(business.logoUrl), coverUrl: safeImage(business.coverUrl), products: business.products.map(serializeProduct) } : null;
}
export async function findPublicProduct(id: string) {
  try { id = parseEntityId(id); } catch { return null; }
  const product = await db.product.findFirst({ where: { id, business: { status: "APPROVED" } }, select: {
    ...productSelect, business: { select: { id: true, name: true, slug: true, city: true } },
  } });
  return product ? serializeProduct(product) : null;
}
// Public data only. Checkout always re-reads authoritative prices and inventory.
export const getPublicProducts = unstable_cache(async () => {
  const products = await db.product.findMany({ where: { inStock: true, business: { status: "APPROVED" } }, select: {
    id: true, name: true, description: true, priceHTG: true, priceUSD: true, imageUrl: true, businessId: true, business: { select: { name: true } },
  }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 100 });
  return products.map(p => ({ id: p.id, name: p.name, description: p.description, priceHTG: p.priceHTG === null ? null : Number(p.priceHTG), priceUSD: p.priceUSD === null ? null : Number(p.priceUSD), imageUrl: safeImage(p.imageUrl), businessId: p.businessId, businessName: p.business.name }));
}, ["public-products-v1"], { revalidate: 60, tags: ["public-catalog"] });
