import { db } from "./db";

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, "") // Trim hyphens
    .slice(0, 60);
}

export async function generateUniqueSlug(
  text: string,
  table: "registry" | "business"
): Promise<string> {
  const base = generateSlug(text);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing =
      table === "registry"
        ? await db.registry.findUnique({ where: { slug } })
        : await db.business.findUnique({ where: { slug } });

    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}
