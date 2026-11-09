import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/**
 * Client IDs a Google ID token may be issued to. The app's native Google sign-in
 * requests a token for the web client ID (AUTH_GOOGLE_ID), so that is the default;
 * AUTH_GOOGLE_MOBILE_AUDIENCES can add more, comma separated.
 */
export function googleAudiences(): string[] {
  return [process.env.AUTH_GOOGLE_ID, ...(process.env.AUTH_GOOGLE_MOBILE_AUDIENCES ?? "").split(",")]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v);
}

export type GoogleIdentity = { sub: string; email: string; name: string | null; picture: string | null };

/** Verifies signature, issuer, audience, expiry and a verified email. Throws on anything else. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const audience = googleAudiences();
  if (!audience.length) throw new Error("GOOGLE_NOT_CONFIGURED");
  if (typeof idToken !== "string" || idToken.length > 4096) throw new Error("INVALID_TOKEN");
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
    clockTolerance: 60,
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string" || payload.email_verified !== true)
    throw new Error("INVALID_TOKEN");
  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name.slice(0, 100) : null,
    picture: typeof payload.picture === "string" && payload.picture.startsWith("https://") ? payload.picture : null,
  };
}
