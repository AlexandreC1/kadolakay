import { optionalWebUrl } from "@/lib/validators/shared";
const safeUrl = (value: string | null) => value && optionalWebUrl.safeParse(value).success ? value : null;
import { db } from "@/lib/db";
import { createWithUniqueSlug } from "@/lib/slug";
import { entitySlugSchema, parseEntityId } from "@/lib/validators/entity-id";
import type { CreateRegistryInput, UpdateRegistryInput } from "@/lib/validators/registry";
export async function createRegistryForUser(userId: string, data: CreateRegistryInput) {
  userId = parseEntityId(userId);
  return createWithUniqueSlug(data.title, "registry", (slug) => db.registry.create({ data: { ...data, slug, userId, eventDate: data.eventDate ? new Date(data.eventDate) : null } }));
}
export async function updateOwnedRegistry(userId: string, id: string, data: UpdateRegistryInput) {
  userId = parseEntityId(userId);
  id = parseEntityId(id);
  const result = await db.registry.updateMany({ where: { id, userId }, data: { ...data, eventDate: data.eventDate === "" ? null : data.eventDate ? new Date(data.eventDate) : undefined } });
  if (!result.count) throw new Error("Registry not found");
  return db.registry.findUniqueOrThrow({ where: { id }, select: { slug: true } });
}
export async function publishOwnedRegistry(userId: string, id: string) {
  userId = parseEntityId(userId);
  id = parseEntityId(id);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM registries WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
    const registry = await tx.registry.findFirst({ where: { id, userId, status: { not: "ARCHIVED" } }, select: { id: true, slug: true, _count: { select: { items: true } } } });
    if (!registry || !registry._count.items) throw new Error("Add at least one gift before publishing");
    await tx.registry.update({ where: { id }, data: { status: "PUBLISHED" } });
    return registry;
  });
}
export async function deleteOwnedRegistry(userId: string, id: string) {
  userId = parseEntityId(userId);
  id = parseEntityId(id);
  // Archive registries with payment history rather than destroy audit records.
  const result = await db.registry.updateMany({ where: { id, userId }, data: { status: "ARCHIVED", isPublic: false } });
  if (!result.count) throw new Error("Registry not found");
}
export async function findPublicRegistry(slug: string) {
  const parsedSlug = entitySlugSchema.safeParse(slug);
  if (!parsedSlug.success) return null;
  slug = parsedSlug.data;
  const registry = await db.registry.findFirst({ where: { slug, status: "PUBLISHED", isPublic: true, password: null }, select: {
    id: true, slug: true, title: true, description: true, type: true, status: true, eventDate: true, coverImage: true, amazonWishlistUrl: true,
    user: { select: { name: true, image: true } },
    items: { orderBy: { priority: "asc" }, select: {
      id: true, title: true, description: true, imageUrl: true, priceHTG: true, priceUSD: true, quantity: true, fulfilledQty: true, reservedQty: true,
      status: true, source: true, externalUrl: true, business: { select: { name: true, slug: true } },
    } },
  } });
  return registry ? { ...registry, coverImage: safeUrl(registry.coverImage), amazonWishlistUrl: safeUrl(registry.amazonWishlistUrl), items: registry.items.map(({ reservedQty, ...item }) => ({ ...item, availableQty: item.quantity - item.fulfilledQty - reservedQty, imageUrl: safeUrl(item.imageUrl), externalUrl: safeUrl(item.externalUrl), priceHTG: item.priceHTG === null ? null : Number(item.priceHTG), priceUSD: item.priceUSD === null ? null : Number(item.priceUSD) })) } : null;
}

export async function listOwnedRegistries(userId: string) {
  userId = parseEntityId(userId);
  const registries = await db.registry.findMany({
    where: { userId, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, type: true, status: true, eventDate: true, isPublic: true, password: true,
      items: { select: { quantity: true, fulfilledQty: true, reservedQty: true } } },
  });
  return registries.map(({ isPublic, password, items, ...registry }) => ({ ...registry,
    canView: registry.status === "PUBLISHED" && isPublic && password === null,
    items: items.map(({ reservedQty, ...item }) => ({ ...item, availableQty: Math.max(0, item.quantity - item.fulfilledQty - reservedQty) })),
  }));
}

/** Only fields the owner's client editor needs may cross the RSC boundary. */
export async function findOwnedRegistryForEdit(userId: string, slug: string) {
  userId = parseEntityId(userId);
  const parsedSlug = entitySlugSchema.safeParse(slug);
  if (!parsedSlug.success) return null;
  const registry = await db.registry.findFirst({
    where: { slug: parsedSlug.data, userId, status: { not: "ARCHIVED" } },
    select: {
      id: true, slug: true, title: true, description: true, eventDate: true, status: true, amazonWishlistUrl: true,
      items: { orderBy: { priority: "asc" }, select: {
        id: true, productId: true, title: true, priceHTG: true, priceUSD: true, quantity: true, fulfilledQty: true, reservedQty: true,
        status: true, source: true, imageUrl: true, externalUrl: true, _count: { select: { orderItems: true } },
      } },
    },
  });
  return registry ? {
    ...registry,
    eventDate: registry.eventDate?.toISOString() ?? null,
    items: registry.items.map(({ reservedQty, _count, ...item }) => ({ ...item, canRemove: reservedQty === 0 && item.fulfilledQty === 0 && _count.orderItems === 0, priceHTG: item.priceHTG === null ? null : Number(item.priceHTG), priceUSD: item.priceUSD === null ? null : Number(item.priceUSD) })),
  } : null;
}
