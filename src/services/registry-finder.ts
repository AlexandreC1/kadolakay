import { db } from "@/lib/db";
import { registryAddress } from "@/lib/registry-address";

/** Exact shared address only. Never disclose why a list is inaccessible. */
export async function previewSharedRegistry(input: unknown, baseUrl: string) {
  const slug = typeof input === "string" ? registryAddress(input, baseUrl) : null;
  if (!slug) return { status: "invalid" } as const;
  const registry = await db.registry.findFirst({
    where: { slug, status: "PUBLISHED", isPublic: true, password: null },
    select: { slug: true, title: true, type: true, eventDate: true, _count: { select: { items: true } } },
  });
  if (!registry) return { status: "missing" } as const;
  return { status: "found", registry: { slug: registry.slug, title: registry.title, type: registry.type, eventDate: registry.eventDate, giftCount: registry._count.items } } as const;
}
