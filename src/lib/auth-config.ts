export type SocialProvider = "google" | "microsoft-entra-id" | "github";

type AuthEnvironment = Record<string, string | undefined>;

/** Public availability only. Never pass the environment object to a client. */
export function getAuthAvailability(env: AuthEnvironment) {
  const present = (name: string) => Boolean(env[name]?.trim());
  const ready = present("DATABASE_URL") && present("AUTH_SECRET");
  const social: SocialProvider[] = [];
  if (ready && present("AUTH_GOOGLE_ID") && present("AUTH_GOOGLE_SECRET")) social.push("google");
  if (ready && present("AUTH_MICROSOFT_ENTRA_ID_ID") && present("AUTH_MICROSOFT_ENTRA_ID_SECRET")) social.push("microsoft-entra-id");
  if (ready && present("AUTH_GITHUB_ID") && present("AUTH_GITHUB_SECRET")) social.push("github");
  return { social, email: ready && present("AUTH_RESEND_KEY") && present("AUTH_RESEND_FROM") };
}

/** OAuth redirects may return only to this application's origin. */
export function safeAuthRedirect(url: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);
    const target = new URL(url, base);
    return target.origin === base.origin && ["http:", "https:"].includes(target.protocol)
      ? target.href
      : base.href;
  } catch {
    return new URL(baseUrl).href;
  }
}

export function authErrorKey(error?: string | null) {
  switch (error) {
    case "OAuthAccountNotLinked": return "accountNotLinked";
    case "AccessDenied": return "accessDenied";
    case "Verification": return "expiredLink";
    case "Configuration": return "unavailable";
    default: return "signInFailed";
  }
}
