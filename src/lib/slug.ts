import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export function generateSlug(text: string): string {
  const normalized = text.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return normalized || "gift-list";
}

export async function generateUniqueSlug(text: string, table: "registry" | "business"): Promise<string> {
  const base = generateSlug(text);
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 8)}`;
    const existing = table === "registry"
      ? await db.registry.findUnique({ where: { slug }, select: { id: true } })
      : await db.business.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  throw new Error("Could not create a unique link. Please try again.");
}

/** The unique database constraint is the authority when simultaneous creates race. */
export async function createWithUniqueSlug<T>(text: string, table: "registry" | "business", create: (slug: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await generateUniqueSlug(text, table);
    try {
      return await create(slug);
    } catch (error) {
      const target = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : undefined;
      const slugCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        && (Array.isArray(target) ? target.includes("slug") : typeof target === "string" && target.includes("slug"));
      if (!slugCollision) throw error;
    }
  }
  throw new Error("Could not create a unique link. Please try again.");
}
