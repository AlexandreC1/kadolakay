import { randomBytes } from "node:crypto";
import { db } from "./db";

function randomSuffix(len = 6): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(len), (b) => alphabet[b % alphabet.length]).join("");
}

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
  // Titles made only of emoji / non-Latin script produce "" (review L5).
  const base = generateSlug(text) || table;
  // Bounded: the clean slug, then random suffixes (no unbounded counter loop).
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 && base !== table ? base : `${base}-${randomSuffix()}`;
    const existing =
      table === "registry"
        ? await db.registry.findUnique({ where: { slug }, select: { id: true } })
        : await db.business.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  return `${base}-${randomSuffix(10)}`;
}
