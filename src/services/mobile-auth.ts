import { db } from "@/lib/db";
import { emailLocale } from "@/lib/email";
import { normalizeEmailIdentifier } from "@/lib/auth-email";
import type { GoogleIdentity } from "@/lib/google-id-token";
import { sendSignInCode } from "@/lib/mobile-email";
import { hashMobileToken, hashSignInCode, newMobileToken, newSignInCode, sameHash } from "@/lib/mobile-token";
import { canPerform, type Permission } from "./permissions";

const SESSION_DAYS = 30;
const MAX_SESSIONS = 10;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 5;
const CODE_WINDOW_MINUTES = 30;

export class MobileAuthError extends Error {
  constructor(public readonly code: "INVALID_EMAIL" | "TOO_MANY_CODES" | "EMAIL_UNAVAILABLE" | "INVALID_CODE" | "SIGNED_OUT" | "SUSPENDED" | "FORBIDDEN") {
    super(code);
  }
}

export const mobileUserSelect = {
  id: true, name: true, email: true, role: true, preferredLocale: true, suspendedAt: true, sessionVersion: true,
  onboardingCompletedAt: true, onboardingDeferredAt: true, business: { select: { slug: true, status: true } },
} as const;

/* ---------------- Sessions ---------------- */

/** Opens a session for this account and returns the bearer token, shown once. */
export async function createMobileSession(userId: string, label?: string) {
  const token = newMobileToken();
  const now = new Date();
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { sessionVersion: true, suspendedAt: true } });
    if (!user || user.suspendedAt) throw new MobileAuthError("SUSPENDED");
    await tx.mobileSession.deleteMany({ where: { userId, OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] } });
    const extra = await tx.mobileSession.findMany({ where: { userId }, orderBy: { lastUsedAt: "desc" }, skip: MAX_SESSIONS - 1, select: { id: true } });
    if (extra.length) await tx.mobileSession.deleteMany({ where: { id: { in: extra.map((s) => s.id) } } });
    await tx.mobileSession.create({
      data: {
        userId, tokenHash: hashMobileToken(token), sessionVersion: user.sessionVersion,
        label: (label ?? "Bayou app").slice(0, 80), expiresAt: new Date(now.getTime() + SESSION_DAYS * 86400000),
      },
    });
  });
  return token;
}

/**
 * The signed-in account for a bearer token, or null. A token stops working when it
 * expires, is revoked, the account is suspended, or "sign out everywhere" bumped
 * the account's sessionVersion on the web.
 */
export async function resolveMobileSession(token: string | null) {
  if (!token) return null;
  const session = await db.mobileSession.findUnique({
    where: { tokenHash: hashMobileToken(token) },
    select: { id: true, sessionVersion: true, expiresAt: true, revokedAt: true, lastUsedAt: true, user: { select: mobileUserSelect } },
  });
  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now || session.user.suspendedAt
    || session.user.sessionVersion !== session.sessionVersion) return null;
  if (now - session.lastUsedAt.getTime() > 10 * 60000)
    await db.mobileSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } }).catch(() => {});
  return { sessionId: session.id, user: session.user };
}

/** Same rule as requireActor on the web: database role, never the client's word. */
export async function requireMobileActor(token: string | null, action: Permission) {
  const session = await resolveMobileSession(token);
  if (!session) throw new MobileAuthError("SIGNED_OUT");
  if (!canPerform(session.user.role, action)) throw new MobileAuthError("FORBIDDEN");
  return session;
}

export async function revokeMobileSession(token: string | null) {
  if (!token) return;
  await db.mobileSession.updateMany({ where: { tokenHash: hashMobileToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

/* ---------------- Email codes ---------------- */

/**
 * Sends a fresh code and retires any earlier unused one for the address.
 * Answers the same whether or not an account exists, so it reveals nothing.
 */
export async function startEmailSignIn(rawEmail: unknown, rawLocale: unknown) {
  let email: string;
  try { email = normalizeEmailIdentifier(String(rawEmail ?? "")); } catch { throw new MobileAuthError("INVALID_EMAIL"); }
  const locale = emailLocale(typeof rawLocale === "string" ? rawLocale : null);
  const since = new Date(Date.now() - CODE_WINDOW_MINUTES * 60000);
  const recent = await db.emailSignInCode.count({ where: { email, createdAt: { gt: since } } });
  if (recent >= MAX_CODES_PER_WINDOW) throw new MobileAuthError("TOO_MANY_CODES");
  const code = newSignInCode();
  await db.$transaction([
    db.emailSignInCode.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: new Date() } }),
    db.emailSignInCode.create({ data: { email, codeHash: hashSignInCode(email, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60000) } }),
  ]);
  if (!(await sendSignInCode(email, code, locale))) throw new MobileAuthError("EMAIL_UNAVAILABLE");
  return { email };
}

/** Checks a code; five wrong tries retire it. On success the account is created if new. */
export async function verifyEmailSignIn(rawEmail: unknown, rawCode: unknown, rawLocale: unknown) {
  let email: string;
  try { email = normalizeEmailIdentifier(String(rawEmail ?? "")); } catch { throw new MobileAuthError("INVALID_EMAIL"); }
  const code = typeof rawCode === "string" && /^\d{6}$/.test(rawCode) ? rawCode : null;
  const locale = emailLocale(typeof rawLocale === "string" ? rawLocale : null);
  const user = await db.$transaction(async (tx) => {
    const row = await tx.emailSignInCode.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    // Serialize attempts on this code so parallel guesses cannot exceed the limit.
    await tx.$queryRaw`SELECT id FROM email_sign_in_codes WHERE id = ${row.id} FOR UPDATE`;
    const fresh = await tx.emailSignInCode.findUniqueOrThrow({ where: { id: row.id } });
    if (fresh.consumedAt || fresh.attempts >= MAX_ATTEMPTS) return null;
    if (!code || !sameHash(fresh.codeHash, hashSignInCode(email, code))) {
      await tx.emailSignInCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 }, ...(fresh.attempts + 1 >= MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) },
      });
      return null;
    }
    await tx.emailSignInCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, suspendedAt: true, emailVerified: true } });
    if (existing?.suspendedAt) throw new MobileAuthError("SUSPENDED");
    if (existing) {
      if (!existing.emailVerified) await tx.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } });
      return existing.id;
    }
    const created = await tx.user.create({ data: { email, emailVerified: new Date(), preferredLocale: locale }, select: { id: true } });
    return created.id;
  });
  if (!user) throw new MobileAuthError("INVALID_CODE");
  return user;
}

/* ---------------- Google ---------------- */

/**
 * Signs in with a verified Google identity. An existing Google link wins; otherwise a
 * verified Google email joins the account that already uses that email, which Google
 * has proven the person controls. No Google tokens are stored.
 */
export async function signInWithGoogle(identity: GoogleIdentity, rawLocale: unknown) {
  const locale = emailLocale(typeof rawLocale === "string" ? rawLocale : null);
  let email: string;
  try { email = normalizeEmailIdentifier(identity.email); } catch { throw new MobileAuthError("INVALID_EMAIL"); }
  return db.$transaction(async (tx) => {
    const linked = await tx.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: identity.sub } },
      select: { user: { select: { id: true, suspendedAt: true } } },
    });
    if (linked) {
      if (linked.user.suspendedAt) throw new MobileAuthError("SUSPENDED");
      return linked.user.id;
    }
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, suspendedAt: true, name: true } });
    if (existing?.suspendedAt) throw new MobileAuthError("SUSPENDED");
    const userId = existing?.id ?? (await tx.user.create({
      data: { email, emailVerified: new Date(), name: identity.name, preferredLocale: locale },
      select: { id: true },
    })).id;
    if (existing && !existing.name && identity.name) await tx.user.update({ where: { id: existing.id }, data: { name: identity.name } });
    await tx.account.create({ data: { userId, type: "oidc", provider: "google", providerAccountId: identity.sub } });
    return userId;
  });
}

/* ---------------- Profile ---------------- */

export function onboardingState(u: { onboardingCompletedAt: Date | null; onboardingDeferredAt: Date | null }) {
  return u.onboardingCompletedAt ? "done" : u.onboardingDeferredAt ? "deferred" : "new";
}

export function mobileUserDto(u: {
  id: string; name: string | null; email: string; preferredLocale: string; role: string;
  onboardingCompletedAt: Date | null; onboardingDeferredAt: Date | null; business: { slug: string; status: string } | null;
}) {
  return {
    id: u.id, name: u.name ?? "", email: u.email, locale: emailLocale(u.preferredLocale), role: u.role,
    onboarding: onboardingState(u), business: u.business ? { slug: u.business.slug, status: u.business.status } : null,
  };
}
