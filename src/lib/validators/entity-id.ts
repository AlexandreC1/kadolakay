import { z } from "zod";

// CUIDs, UUIDs, and legacy seeded identifiers are accepted. Prisma filter objects are not.
export const entityIdSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
export const entitySlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export function parseEntityId(value: unknown): string {
  const parsed = entityIdSchema.safeParse(value);
  if (!parsed.success) throw new Error("Invalid identifier");
  return parsed.data;
}
