import { entitySlugSchema } from "./validators/entity-id";
export function registryShareUrl(slug: string, locale: string, baseUrl: string) {
  if (!entitySlugSchema.safeParse(slug).success || !["ht", "fr", "en"].includes(locale)) throw new Error("INVALID_SHARE_ADDRESS");
  const base = new URL(baseUrl);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("INVALID_SHARE_ORIGIN");
  return new URL(`${locale === "ht" ? "" : `/${locale}`}/r/${slug}`, base).href;
}
