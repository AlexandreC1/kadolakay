"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addItemSchema, updateItemSchema } from "@/lib/validators/registry";
import { revalidatePath } from "next/cache";

export async function addItemToRegistry(registryId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const registry = await db.registry.findUnique({
    where: { id: registryId },
  });

  if (!registry || registry.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const raw = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    priceHTG: formData.get("priceHTG") ? Number(formData.get("priceHTG")) : undefined,
    priceUSD: formData.get("priceUSD") ? Number(formData.get("priceUSD")) : undefined,
    quantity: Number(formData.get("quantity")) || 1,
    source: (formData.get("source") as string) || "CUSTOM",
    externalUrl: (formData.get("externalUrl") as string) || undefined,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const parsed = addItemSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid item data");
  const data = parsed.data;

  await db.registryItem.create({
    data: {
      ...data,
      registryId,
    },
  });

  revalidatePath(`/r/${registry.slug}`);
}

export async function removeRegistryItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const item = await db.registryItem.findUnique({
    where: { id: itemId },
    include: { registry: { select: { userId: true, slug: true } } },
  });

  if (!item || item.registry.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  await db.registryItem.delete({
    where: { id: itemId },
  });

  revalidatePath(`/r/${item.registry.slug}`);
}

export async function updateRegistryItem(itemId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const item = await db.registryItem.findUnique({
    where: { id: itemId },
    include: { registry: { select: { userId: true, slug: true } } },
  });

  if (!item || item.registry.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  // Only these fields are editable; every value goes through the same
  // validation as on create (review H1: this path used to skip validation,
  // so a javascript: externalUrl could be stored here).
  const ALLOWED_FIELDS = ["title", "description", "priceHTG", "priceUSD", "quantity", "externalUrl", "imageUrl"] as const;
  const raw: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string" && value !== "") raw[key] = value;
  }
  const parsed = updateItemSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid item data");
  const updates = parsed.data;
  if (updates.quantity !== undefined && updates.quantity < item.fulfilledQty) {
    throw new Error("Quantity can't be lower than the number already gifted");
  }

  await db.registryItem.update({
    where: { id: itemId },
    data: updates,
  });

  revalidatePath(`/r/${item.registry.slug}`);
}

/**
 * Add a product from an approved local business directly into a registry.
 * This bridges the business catalog with user registries — a key feature
 * for supporting Haitian local commerce.
 */
export async function addBusinessProductToRegistry(
  registryId: string,
  productId: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const registry = await db.registry.findUnique({
    where: { id: registryId },
  });

  if (!registry || registry.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { business: { select: { id: true, name: true, status: true } } },
  });

  if (!product || product.business.status !== "APPROVED") {
    throw new Error("Product not found or business not approved");
  }

  await db.registryItem.create({
    data: {
      registryId,
      title: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      priceHTG: product.priceHTG,
      priceUSD: product.priceUSD,
      source: "LOCAL_BUSINESS",
      businessId: product.business.id,
      productId: product.id,
    },
  });

  revalidatePath(`/r/${registry.slug}`);
}
