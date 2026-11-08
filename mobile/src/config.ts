/**
 * The Bayou server the app talks to, which is also where shared list links open.
 * Set EXPO_PUBLIC_WEB_URL for each build (the APK workflow does). Without it the
 * app points at the reserved .example domain and shows that it cannot connect,
 * rather than sending anyone to a stranger's site.
 */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://bayou.example").replace(/\/$/, "");
export const API_URL = `${WEB_URL}/api/mobile/v1`;

export const listUrl = (slug: string, locale: string) => `${WEB_URL}/${locale}/r/${slug}`;

/** The web OAuth client ID; Google issues the app's ID token for it. Unset hides Google sign-in. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

export const APP_VERSION = "0.2.0";
