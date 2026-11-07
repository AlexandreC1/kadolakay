/**
 * Where shared links point. The owner has not chosen the production domain yet
 * (docs/DECISIONS.md), so set EXPO_PUBLIC_WEB_URL per build; the reserved
 * .example fallback makes an unset value obvious rather than sending people to a stranger's site.
 */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://bayou.example").replace(/\/$/, "");

export const listUrl = (slug: string, locale: string) => `${WEB_URL}/${locale}/r/${slug}`;

export const APP_VERSION = "0.1.0";
