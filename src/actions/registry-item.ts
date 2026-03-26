"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addItemSchema } from "@/lib/validators/registry";
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
    businessId: (formData.get("businessId") as string) || undefined,
    productId: (formData.get("productId") as string) || undefined,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const data = addItemSchema.parse(raw);

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

  const updates: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value !== "") {
      if (key === "priceHTG" || key === "priceUSD") {
        updates[key] = Number(value);
      } else if (key === "quantity") {
        updates[key] = Number(value);
      } else {
        updates[key] = value;
      }
    }
  }

  await db.registryItem.update({
    where: { id: itemId },
    data: updates,
  });

  revalidatePath(`/r/${item.registry.slug}`);
}
