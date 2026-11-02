"use server";
import { parseEntityId } from "@/lib/validators/entity-id";
import {
  addManualGift,
  removeOwnedGift,
  updateOwnedGift,
} from "@/services/registry-items";

import { requireActor } from "@/services/authorization";
import { addItemSchema, updateItemSchema } from "@/lib/validators/registry";
import { parseFormFields } from "@/lib/validators/shared";
import { revalidatePath } from "next/cache";
import {
  addCatalogGift,
  addCatalogGifts,
  CatalogSelectionError,
  type CatalogSelectionErrorCode,
} from "@/services/registry-catalog";
import type { CatalogSelection } from "@/lib/validators/registry-catalog";
export async function addItemToRegistry(
  registryId: string,
  formData: FormData,
) {
  registryId = parseEntityId(registryId);
  const actor = await requireActor("item:add");
  const raw = parseFormFields(formData, [
    "title",
    "description",
    "priceHTG",
    "priceUSD",
    "quantity",
    "source",
    "externalUrl",
    "imageUrl",
  ]);
  const parsed = addItemSchema.safeParse({
    ...raw,
    quantity: raw.quantity ? Number(raw.quantity) : 1,
    source: raw.source || "CUSTOM",
    priceHTG: raw.priceHTG ? Number(raw.priceHTG) : undefined,
    priceUSD: raw.priceUSD ? Number(raw.priceUSD) : undefined,
  });
  if (!parsed.success || parsed.data.source === "LOCAL_BUSINESS")
    throw new Error("Check the gift details and try again");
  if (
    ["EXTERNAL", "AMAZON"].includes(parsed.data.source) &&
    !parsed.data.externalUrl
  )
    throw new Error("Add the store link for this gift");
  await addManualGift(actor.id, registryId, parsed.data);
  revalidatePath("/", "layout");
}
export async function removeRegistryItem(itemId: string) {
  itemId = parseEntityId(itemId);
  const actor = await requireActor("item:remove");
  await removeOwnedGift(actor.id, itemId);
  revalidatePath("/", "layout");
}
export async function updateRegistryItem(itemId: string, formData: FormData) {
  itemId = parseEntityId(itemId);
  const actor = await requireActor("item:update");
  const raw = parseFormFields(formData, [
    "title",
    "description",
    "priceHTG",
    "priceUSD",
    "quantity",
    "externalUrl",
    "imageUrl",
  ]);
  const values: Record<string, unknown> = { ...raw };
  for (const key of ["priceHTG", "priceUSD", "quantity"])
    if (key in raw) values[key] = raw[key] ? Number(raw[key]) : undefined;
  const parsed = updateItemSchema.safeParse(values);
  if (!parsed.success) throw new Error("Check the gift details and try again");
  await updateOwnedGift(actor.id, itemId, parsed.data);
  revalidatePath("/", "layout");
}
export async function addBusinessProductToRegistry(
  registryId: string,
  productId: string,
) {
  registryId = parseEntityId(registryId);
  productId = parseEntityId(productId);
  const actor = await requireActor("item:catalog");
  await addCatalogGift(actor.id, registryId, productId);
  revalidatePath("/", "layout");
}

export async function addBusinessProductsToRegistry(
  input: CatalogSelection,
): Promise<
  | { ok: true; addedCount: number }
  | { ok: false; code: CatalogSelectionErrorCode }
> {
  const actor = await requireActor("item:catalog");
  try {
    const result = await addCatalogGifts(actor.id, input);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (error) {
    // Return only bounded, expected domain codes. Auth and unexpected failures propagate.
    if (error instanceof CatalogSelectionError)
      return { ok: false, code: error.code };
    throw error;
  }
}
