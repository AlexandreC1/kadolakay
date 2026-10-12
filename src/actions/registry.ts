"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { createRegistrySchema, updateRegistrySchema } from "@/lib/validators/registry";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canViewRegistry } from "@/lib/validators/registry-access";

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

  const parsed = createRegistrySchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid registry data");
  const data = parsed.data;
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

  // Only known fields; the strict schema rejects anything else.
  const FIELDS = ["type", "title", "description", "eventDate", "locale", "isPublic", "amazonWishlistUrl"] as const;
  const raw: Record<string, unknown> = {};
  for (const key of FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string" && value !== "") raw[key] = value;
  }

  if (raw.isPublic !== undefined) {
    raw.isPublic = raw.isPublic !== "false";
  }

  const parsed = updateRegistrySchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid registry data");
  const data = parsed.data;

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

/**
 * Public registry read. Exported from a "use server" module, so it is
 * callable by anyone with any arguments: it enforces visibility itself
 * (review M3) and never returns shareToken/password.
 *  - DRAFT: owner only
 *  - private (isPublic=false): owner, or a caller presenting the shareToken
 */
export async function getRegistryBySlug(slug: string, shareToken?: string | null) {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 120) return null;
  const registry = await db.registry.findUnique({
    where: { slug },
    omit: { password: true },
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
  if (!registry) return null;

  const session = await auth();
  const isOwner = !!session?.user?.id && session.user.id === registry.userId;
  if (!canViewRegistry(registry, { isOwner, shareToken })) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { shareToken: _secret, ...rest } = registry;
  return rest;
}
