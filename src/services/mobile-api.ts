import { z } from "zod";
import { db } from "@/lib/db";
import { occasionTypes } from "@/lib/occasions";
import { entitySlugSchema, parseEntityId } from "@/lib/validators/entity-id";
import { optionalWebUrl } from "@/lib/validators/shared";
import { createRegistryForUser, findPublicRegistry, publishOwnedRegistry, updateOwnedRegistry } from "./registry";
import { addManualGift, removeOwnedGift } from "./registry-items";
import { addCatalogGifts } from "./registry-catalog";
import { saveRegistryPrivacy, searchPublicRegistries } from "./baskets-privacy";
import { previewSharedRegistry } from "./registry-finder";
import { editOwnedProduct } from "./business";
import { lockActor } from "./locked-actor";
import { listPledgesForOwner } from "./pledges";

/**
 * The mobile app's view of lists, gifts, shops and products. Every write goes
 * through the same services, ownership checks and validators as the web.
 * Shapes match mobile/src/data/types.ts.
 */

export type AppVisibility = "PUBLIC" | "LINK" | "PRIVATE";
const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
const safeUrl = (v: string | null) => (v && optionalWebUrl.safeParse(v).success ? v : undefined);

/** App visibility → web privacy. Only PUBLIC lists are findable by name. */
export function toWebPrivacy(v: AppVisibility) {
  return v === "PUBLIC" ? { visibility: "PUBLIC" as const, searchable: true }
    : v === "PRIVATE" ? { visibility: "PRIVATE" as const, searchable: false }
    : { visibility: "UNLISTED" as const, searchable: false };
}
export function fromWebPrivacy(r: { visibility: string; searchable: boolean; isPublic: boolean }): AppVisibility {
  if (!r.isPublic || r.visibility === "PRIVATE") return "PRIVATE";
  return r.visibility === "PUBLIC" && r.searchable ? "PUBLIC" : "LINK";
}

type OwnerPledge = { id: string; itemId: string; quantity: number; isAnonymous: boolean; message: string | null; createdAt: string; name: string | null };

type ItemRow = {
  id: string; title: string; description: string | null; priceHTG: unknown; priceUSD: unknown; quantity: number;
  fulfilledQty: number; reservedQty?: number; availableQty?: number; source: string; productId: string | null;
  priority?: number; imageUrl?: string | null; business: { slug: string } | null;
};
function giftDto(i: ItemRow) {
  const reserved = i.reservedQty ?? Math.max(0, i.quantity - i.fulfilledQty - (i.availableQty ?? 0));
  return {
    id: i.id, title: i.title, description: i.description ?? undefined,
    priceHTG: num(i.priceHTG), priceUSD: num(i.priceUSD), quantity: i.quantity, fulfilledQty: i.fulfilledQty, reservedQty: reserved,
    source: i.source === "LOCAL_BUSINESS" ? "LOCAL_BUSINESS" : i.source === "CUSTOM" ? "CUSTOM" : "EXTERNAL",
    businessSlug: i.business?.slug, productId: i.productId ?? undefined,
    // Most wanted sorts first on the web too (priority ascending).
    priority: (i.priority ?? 0) < 0 ? 1 : 0,
    imageUrl: safeUrl(i.imageUrl ?? null),
  };
}

const ownerItemSelect = {
  id: true, title: true, description: true, priceHTG: true, priceUSD: true, quantity: true, fulfilledQty: true, reservedQty: true,
  source: true, productId: true, priority: true, imageUrl: true, business: { select: { slug: true } },
} as const;

/* ---------------- Lists ---------------- */

export async function listMine(userId: string) {
  userId = parseEntityId(userId);
  const rows = await db.registry.findMany({
    where: { userId, status: { not: "ARCHIVED" }, kind: "SELF" },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      slug: true, userId: true, type: true, status: true, title: true, description: true, eventDate: true, place: true,
      visibility: true, searchable: true, isPublic: true, createdAt: true, user: { select: { name: true } },
      items: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }], take: 500, select: ownerItemSelect },
    },
  });
  return rows.map((r) => listDto(r));
}

function listDto(r: {
  slug: string; userId?: string; type: string; status: string; title: string; description: string | null; eventDate: Date | null;
  place?: string | null; createdAt?: Date; user: { name: string | null }; items: ItemRow[];
  visibility: string; searchable: boolean; isPublic: boolean;
}, extra: { owner?: boolean; pledges?: OwnerPledge[] } = {}) {
  return {
    slug: r.slug, ownerId: r.userId ?? "", ownerName: r.user.name ?? "", type: r.type,
    status: r.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT", title: r.title, description: r.description ?? undefined,
    eventDate: isoDate(r.eventDate), place: r.place ?? undefined, visibility: fromWebPrivacy(r),
    items: r.items.map(giftDto), createdAt: isoDate(r.createdAt ?? null) ?? "", ...extra,
  };
}

/** The owner sees their list in any state, with who promised what. Everyone else gets the public rules. */
export async function viewList(slug: string, viewerId: string | null) {
  if (!entitySlugSchema.safeParse(slug).success) return null;
  if (viewerId) {
    const own = await db.registry.findFirst({
      where: { slug, userId: viewerId, status: { not: "ARCHIVED" } },
      select: {
        id: true, slug: true, userId: true, type: true, status: true, title: true, description: true, eventDate: true, place: true,
        visibility: true, searchable: true, isPublic: true, createdAt: true, user: { select: { name: true } },
        items: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }], take: 500, select: ownerItemSelect },
      },
    });
    if (own) {
      const pledges = await listPledgesForOwner(viewerId, own.id);
      return listDto(own, { owner: true, pledges: pledges.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })) });
    }
  }
  const pub = await findPublicRegistry(slug);
  if (!pub) return null;
  const place = await db.registry.findUnique({ where: { id: pub.id }, select: { place: true } });
  const priorities = new Map((await db.registryItem.findMany({ where: { registryId: pub.id }, select: { id: true, priority: true } })).map((i) => [i.id, i.priority]));
  return listDto({
    ...pub, place: place?.place ?? null, isPublic: true,
    items: pub.items.map((i) => ({ ...i, priority: priorities.get(i.id) ?? 0, business: i.business ? { slug: i.business.slug } : null })),
  }, { owner: false });
}

const createListSchema = z.strictObject({
  type: z.enum(occasionTypes),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  place: z.string().trim().max(80).optional(),
  visibility: z.enum(["PUBLIC", "LINK", "PRIVATE"]),
  locale: z.enum(["ht", "fr", "en"]).default("ht"),
});
// An empty eventDate clears it.
export const updateListSchema = createListSchema.omit({ locale: true, eventDate: true }).partial()
  .extend({ eventDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional() });

export async function createList(userId: string, input: unknown) {
  const data = createListSchema.parse(input);
  const created = await createRegistryForUser(userId, {
    type: data.type, title: data.title, description: data.description, eventDate: data.eventDate, locale: data.locale,
    isPublic: data.visibility !== "PRIVATE",
  });
  await db.registry.update({ where: { id: created.id }, data: { place: data.place || null } });
  await saveRegistryPrivacy(userId, { registryId: created.id, ...toWebPrivacy(data.visibility) });
  return { slug: created.slug };
}

async function ownedId(userId: string, slug: string) {
  if (!entitySlugSchema.safeParse(slug).success) throw new Error("Registry not found");
  const r = await db.registry.findFirst({ where: { slug, userId: parseEntityId(userId), status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!r) throw new Error("Registry not found");
  return r.id;
}

export async function updateList(userId: string, slug: string, input: unknown) {
  const data = updateListSchema.parse(input);
  const id = await ownedId(userId, slug);
  const { place, visibility, ...core } = data;
  if (Object.keys(core).length) await updateOwnedRegistry(userId, id, core);
  if (place !== undefined) await db.registry.updateMany({ where: { id, userId }, data: { place: place || null } });
  if (visibility) await saveRegistryPrivacy(userId, { registryId: id, ...toWebPrivacy(visibility) });
  return { slug };
}

export async function publishList(userId: string, slug: string) {
  return publishOwnedRegistry(userId, await ownedId(userId, slug));
}

const addGiftsSchema = z.union([
  z.strictObject({ productIds: z.array(z.string().min(1).max(100)).min(1).max(20) }),
  z.strictObject({ custom: z.strictObject({ title: z.string().trim().min(1).max(200), priceHTG: z.number().positive().max(10_000_000).optional(), quantity: z.number().int().min(1).max(1000) }) }),
]);
export async function addGifts(userId: string, slug: string, input: unknown) {
  const data = addGiftsSchema.parse(input);
  const registryId = await ownedId(userId, slug);
  if ("productIds" in data) return addCatalogGifts(userId, { registryId, productIds: data.productIds });
  return addManualGift(userId, registryId, { ...data.custom, source: "CUSTOM" });
}

export async function removeGift(userId: string, slug: string, itemId: string) {
  await ownedId(userId, slug);
  return removeOwnedGift(userId, itemId);
}

/** Most wanted is the only thing that may change on a gift someone already gave. */
export async function setMostWanted(userId: string, slug: string, itemId: string, wanted: boolean) {
  userId = parseEntityId(userId);
  itemId = parseEntityId(itemId);
  const registryId = await ownedId(userId, slug);
  await db.$transaction(async (tx) => {
    await lockActor(tx, userId, "item:update");
    const result = await tx.registryItem.updateMany({ where: { id: itemId, registryId, registry: { userId } }, data: { priority: wanted ? -1 : 0 } });
    if (!result.count) throw new Error("Gift not found");
  });
}

/** Name search (lists their owners made findable) plus an exact pasted link. */
export async function searchLists(q: string, baseUrl: string) {
  const query = q.trim().slice(0, 500);
  if (query.length < 2) return [];
  const [direct, named] = await Promise.all([
    previewSharedRegistry(query, baseUrl),
    query.length <= 80 ? searchPublicRegistries({ q: query }) : Promise.resolve({ items: [], next: null }),
  ]);
  const slugs = [...new Set([...(direct.status === "found" ? [direct.registry.slug] : []), ...named.items.map((r) => r.slug)])].slice(0, 8);
  const lists = await Promise.all(slugs.map((s) => viewList(s, null)));
  return lists.filter((l): l is NonNullable<typeof l> => !!l);
}

/* ---------------- Catalog ---------------- */

/** Approved shops and their in-stock products, public fields only. Small enough for a pilot to send whole. */
export async function catalog() {
  const shops = await db.business.findMany({
    where: { status: "APPROVED", owner: { suspendedAt: null } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 200,
    select: {
      slug: true, ownerId: true, name: true, category: true, city: true, department: true, description: true, phone: true, whatsapp: true,
      fulfillmentPolicy: true, status: true, createdAt: true, logoUrl: true,
      products: {
        where: { inStock: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 200,
        select: { id: true, name: true, description: true, priceHTG: true, priceUSD: true, stockQuantity: true, reservedStock: true, category: true, imageUrl: true },
      },
    },
  });
  return {
    businesses: shops.map(({ products, createdAt, logoUrl, ...b }) => ({
      productCount: products.length,
      ...b, city: b.city ?? "", department: b.department ?? "", description: b.description ?? "", phone: b.phone ?? undefined,
      whatsapp: b.whatsapp ?? undefined, fulfillmentPolicy: b.fulfillmentPolicy ?? "", since: createdAt.toISOString().slice(0, 7),
      logoUrl: safeUrl(logoUrl),
    })),
    products: shops.flatMap((b) => b.products
      .filter((p) => p.priceHTG !== null || p.priceUSD !== null)
      .map((p) => ({
        id: p.id, businessSlug: b.slug, name: p.name, description: p.description ?? "", category: p.category ?? b.category,
        priceHTG: num(p.priceHTG) ?? 0, priceUSD: num(p.priceUSD) ?? 0, imageUrl: safeUrl(p.imageUrl),
        stockQuantity: p.stockQuantity === null ? null : Math.max(0, p.stockQuantity - p.reservedStock),
      }))),
  };
}

/* ---------------- Shop owner ---------------- */

export async function myShop(userId: string) {
  userId = parseEntityId(userId);
  const b = await db.business.findUnique({
    where: { ownerId: userId },
    select: {
      slug: true, name: true, status: true,
      products: { orderBy: [{ name: "asc" }, { id: "asc" }], take: 500, select: { id: true, name: true, description: true, priceHTG: true, priceUSD: true, stockQuantity: true, inStock: true, category: true } },
    },
  });
  if (!b) return null;
  const pledged = await db.giftPledge.findMany({
    where: { cancelledAt: null, item: { business: { ownerId: userId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, quantity: true, createdAt: true, item: { select: { title: true, productId: true } }, registry: { select: { title: true, place: true } } },
  });
  return {
    slug: b.slug, name: b.name, status: b.status,
    products: b.products.map((p) => ({ ...p, description: p.description ?? "", priceHTG: num(p.priceHTG) ?? 0, priceUSD: num(p.priceUSD) ?? 0 })),
    // Guests who promised one of this shop's products. They pay the shop directly.
    pledges: pledged.map((p) => ({ id: p.id, quantity: p.quantity, title: p.item.title, list: p.registry.title, place: p.registry.place, createdAt: p.createdAt.toISOString() })),
  };
}

/** Stock only, through the same product service the web form uses. */
export async function setStock(userId: string, productId: string, stockQuantity: number | null) {
  userId = parseEntityId(userId);
  productId = parseEntityId(productId);
  if (stockQuantity !== null && (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 100000)) throw new Error("Invalid stock");
  const p = await db.product.findFirst({
    where: { id: productId, business: { ownerId: userId } },
    select: { name: true, description: true, priceHTG: true, priceUSD: true, category: true, imageUrl: true },
  });
  if (!p) throw new Error("Product not found");
  await editOwnedProduct(userId, productId, {
    name: p.name, description: p.description ?? undefined, priceHTG: num(p.priceHTG), priceUSD: num(p.priceUSD),
    category: p.category ?? undefined, imageUrl: p.imageUrl ?? undefined, stockQuantity, inStock: stockQuantity !== 0,
  });
}
