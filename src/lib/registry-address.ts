import { entitySlugSchema } from "./validators/entity-id";

/** Exact-address lookup only. No name enumeration or cross-origin redirect. */
export function registryAddress(value: string, baseUrl: string): string | null {
  if (value.length > 500) return null;
  const input = value.trim();
  if (entitySlugSchema.safeParse(input).success) return input;
  try {
    const base = new URL(baseUrl);
    const url = new URL(input, base);
    if (url.origin !== base.origin || url.username || url.password || url.search || url.hash) return null;
    const match = url.pathname.match(/^\/(?:ht\/|fr\/|en\/)?r\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
    return match && entitySlugSchema.safeParse(match[1]).success ? match[1] : null;
  } catch { return null; }
}
