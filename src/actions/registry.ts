"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { createRegistrySchema, updateRegistrySchema } from "@/lib/validators/registry";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRegistry(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const raw = {
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    eventDate: (formData.get("eventDate") as string) || undefined,
    locale: (formData.get("locale") as string) || "ht",
    isPublic: formData.get("isPublic") !== "false",
    amazonWishlistUrl: (formData.get("amazonWishlistUrl") as string) || undefined,
  };

  const data = createRegistrySchema.parse(raw);
  const slug = await generateUniqueSlug(data.title, "registry");

  const registry = await db.registry.create({
    data: {
      ...data,
      slug,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      userId: session.user.id,
    },
  });

  revalidatePath("/my-registries");
  redirect(`/r/${registry.slug}/edit`);
}

export async function updateRegistry(registryId: string, formData: FormData) {
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

  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value !== "") raw[key] = value;
  }

  if (raw.isPublic !== undefined) {
    raw.isPublic = raw.isPublic !== "false";
  }

  const data = updateRegistrySchema.parse(raw);

  await db.registry.update({
    where: { id: registryId },
    data: {
      ...data,
      eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
    },
  });

  revalidatePath(`/r/${registry.slug}`);
  revalidatePath("/my-registries");
}

export async function publishRegistry(registryId: string) {
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

  await db.registry.update({
    where: { id: registryId },
    data: { status: "PUBLISHED" },
  });

  revalidatePath(`/r/${registry.slug}`);
  revalidatePath("/my-registries");
}

export async function deleteRegistry(registryId: string) {
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

  await db.registry.delete({
    where: { id: registryId },
  });

  revalidatePath("/my-registries");
  redirect("/my-registries");
}

export async function getMyRegistries() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return db.registry.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        select: { id: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRegistryBySlug(slug: string) {
  return db.registry.findUnique({
    where: { slug },
    include: {
      user: {
        select: { name: true, image: true },
      },
      items: {
        where: { status: { not: "FULFILLED" } },
        include: {
          business: {
            select: { name: true, slug: true },
          },
        },
        orderBy: { priority: "asc" },
      },
    },
  });
}
