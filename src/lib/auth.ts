import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { checkRateLimit } from "./rate-limit";
import { log } from "./log";

const DAY = 24 * 60 * 60;
/** How often (seconds) a session re-reads role/ban/tokenVersion from the DB (review M1). */
export const SESSION_RECHECK_SECONDS = 5 * 60;

type AuthState = { role: Role; tokenVersion: number; bannedAt: Date | null; deletedAt: Date | null };

async function loadAuthState(userId: string): Promise<AuthState | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: { role: true, tokenVersion: true, bannedAt: true, deletedAt: true },
  });
}

/**
 * Pure decision used by the jwt callback (exported for tests).
 * Returns the refreshed claims, or null when the session must end.
 */
export function refreshClaims(
  token: { tokenVersion?: number },
  state: AuthState | null
): { role: Role; tokenVersion: number } | null {
  if (!state || state.bannedAt || state.deletedAt) return null;
  if (token.tokenVersion !== undefined && token.tokenVersion !== state.tokenVersion) return null;
  return { role: state.role, tokenVersion: state.tokenVersion };
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  // PrismaAdapter is typed against @auth/core/adapters but our type augmentation
  // narrows next-auth's AdapterUser. Cast bridges the structurally identical types.
  adapter: PrismaAdapter(db) as Adapter,
  // JWT sessions are required so the proxy can read role at the edge.
  // Short-lived and re-validated against the DB every few minutes (review M1).
  session: { strategy: "jwt", maxAge: 7 * DAY, updateAge: DAY },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      from: process.env.AUTH_RESEND_FROM || "KadoLakay <noreply@kadolakay.com>",
      // Magic links expire after 15 minutes (default is 24h).
      maxAge: 15 * 60,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
  callbacks: {
    async signIn({ user, email }) {
      // Magic-link request: limit per address to stop email bombing.
      if (email?.verificationRequest) {
        const address = (user.email ?? "").trim().toLowerCase();
        const r = await checkRateLimit("magicLink", `email:${address}`);
        if (!r.ok) {
          log.warn("auth: magic link rate limited");
          return false;
        }
      }
      // Banned or deleted accounts can't sign in again.
      if (user.id) {
        const state = await loadAuthState(user.id);
        if (state && (state.bannedAt || state.deletedAt)) return false;
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      const now = Math.floor(Date.now() / 1000);
      if (user) {
        // Sign-in: hydrate from the DB row.
        const state = user.id ? await loadAuthState(user.id) : null;
        token.id = user.id;
        token.role = state?.role ?? (user as { role?: Role }).role ?? "USER";
        token.tokenVersion = state?.tokenVersion ?? 0;
        token.checkedAt = now;
        return token;
      }
      const userId = (token.id as string | undefined) ?? token.sub;
      if (!userId) return null;
      const stale = !token.checkedAt || now - token.checkedAt > SESSION_RECHECK_SECONDS;
      if (trigger === "update" || stale || !token.role) {
        const claims = refreshClaims(token, await loadAuthState(userId));
        if (!claims) return null; // ends the session (banned, deleted, or signed out everywhere)
        token.role = claims.role;
        token.tokenVersion = claims.tokenVersion;
        token.checkedAt = now;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? session.user.id;
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
});

/**
 * Invalidate every session of a user (logout everywhere, ban, role demotion).
 * Takes effect within SESSION_RECHECK_SECONDS on every device.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

/** Re-read role into the current session now (e.g. right after registerBusiness). */
export async function refreshSession(): Promise<void> {
  await unstable_update({});
}
