"use server";
import { parseEntityId } from "@/lib/validators/entity-id";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireActor } from "@/services/authorization";
import { addItemSchema, updateItemSchema } from "@/lib/validators/registry";
import { parseFormFields } from "@/lib/validators/shared";
import { revalidatePath } from "next/cache";
import { addCatalogGift, addCatalogGifts, CatalogSelectionError, type CatalogSelectionErrorCode } from "@/services/registry-catalog";
import type { CatalogSelection } from "@/lib/validators/registry-catalog";
async function ownedRegistry(userId: string, id: string) {
  id = parseEntityId(id);
  userId = parseEntityId(userId);
  const registry = await db.registry.findFirst({ where: { id, userId, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!registry) throw new Error("Registry not found");
}
export async function addItemToRegistry(registryId: string, formData: FormData) {
  registryId = parseEntityId(registryId);
  const actor = await requireActor("item:add");
  await ownedRegistry(actor.id, registryId);
  const raw = parseFormFields(formData, ["title", "description", "priceHTG", "priceUSD", "quantity", "source", "externalUrl", "imageUrl"]);
  const parsed = addItemSchema.safeParse({ ...raw, quantity: raw.quantity ? Number(raw.quantity) : 1, source: raw.source || "CUSTOM", priceHTG: raw.priceHTG ? Number(raw.priceHTG) : undefined, priceUSD: raw.priceUSD ? Number(raw.priceUSD) : undefined });
  if (!parsed.success || parsed.data.source === "LOCAL_BUSINESS") throw new Error("Check the gift details and try again");
  if (["EXTERNAL", "AMAZON"].includes(parsed.data.source) && !parsed.data.externalUrl) throw new Error("Add the store link for this gift");
  await db.registryItem.create({ data: { ...parsed.data, registryId } });
  revalidatePath("/", "layout");
}
async function editableItem(tx: Prisma.TransactionClient, actorId: string, id: string) {
  id = parseEntityId(id);
  actorId = parseEntityId(actorId);
  // Lock the same row used by checkout reservations before inspecting paid stock.
  await tx.$queryRaw`SELECT id FROM registry_items WHERE id = ${id} FOR UPDATE`;
  const item = await tx.registryItem.findUnique({ where: { id }, include: { registry: { select: { userId: true } }, _count: { select: { orderItems: true } } } });
  if (!item || item.registry.userId !== actorId) throw new Error("Gift not found");
  if (item.reservedQty > 0 || item.fulfilledQty > 0 || item._count.orderItems > 0) throw new Error("Gifts with checkout or payment history cannot be changed");
  return item;
}
export async function removeRegistryItem(itemId: string) {
  itemId = parseEntityId(itemId);
  const actor = await requireActor("item:remove");
  await db.$transaction(async tx => { await editableItem(tx, actor.id, itemId); await tx.registryItem.delete({ where: { id: itemId } }); });
  revalidatePath("/", "layout");
}
export async function updateRegistryItem(itemId: string, formData: FormData) {
  itemId = parseEntityId(itemId);
  const actor = await requireActor("item:update");
  const raw = parseFormFields(formData, ["title", "description", "priceHTG", "priceUSD", "quantity", "externalUrl", "imageUrl"]);
  const values: Record<string, unknown> = { ...raw };
  for (const key of ["priceHTG", "priceUSD", "quantity"]) if (key in raw) values[key] = raw[key] ? Number(raw[key]) : undefined;
  const parsed = updateItemSchema.safeParse(values);
  if (!parsed.success) throw new Error("Check the gift details and try again");
  await db.$transaction(async tx => { await editableItem(tx, actor.id, itemId); await tx.registryItem.update({ where: { id: itemId }, data: parsed.data }); });
  revalidatePath("/", "layout");
}
export async function addBusinessProductToRegistry(registryId: string, productId: string) {
  registryId = parseEntityId(registryId);
  productId = parseEntityId(productId);
  const actor = await requireActor("item:catalog");
  await addCatalogGift(actor.id, registryId, productId);
  revalidatePath("/", "layout");
}

export async function addBusinessProductsToRegistry(input: CatalogSelection): Promise<
  { ok: true; addedCount: number } | { ok: false; code: CatalogSelectionErrorCode }
> {
  const actor = await requireActor("item:catalog");
  try {
    const result = await addCatalogGifts(actor.id, input);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (error) {
    // Return only bounded, expected domain codes. Auth and unexpected failures propagate.
    if (error instanceof CatalogSelectionError) return { ok: false, code: error.code };
    throw error;
  }
}
