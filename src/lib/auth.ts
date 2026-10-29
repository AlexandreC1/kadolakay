import NextAuth from "next-auth";
import { brandEmailSender } from "./brand";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import GitHub from "next-auth/providers/github";
import { getAuthAvailability, safeAuthRedirect } from "./auth-config";
import { normalizeEmailIdentifier } from "./auth-email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { Role } from "@prisma/client";
import { db } from "./db";

const availability = getAuthAvailability(process.env);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter is typed against @auth/core/adapters but our type augmentation
  // narrows next-auth's AdapterUser. Cast bridges the structurally identical types.
  adapter: PrismaAdapter(db) as Adapter,
  // JWT sessions are required so middleware can read role at the edge
  // (Prisma adapter cannot run in edge runtime).
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers: [
    ...(availability.social.includes("google") ? [Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: "select_account" } },
    })] : []),
    ...(availability.social.includes("microsoft-entra-id") ? [MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER || "https://login.microsoftonline.com/common/v2.0/",
    })] : []),
    ...(availability.social.includes("github") ? [GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })] : []),
    ...(availability.email ? [Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: brandEmailSender(process.env.AUTH_RESEND_FROM),
      maxAge: 15 * 60,
      normalizeIdentifier: normalizeEmailIdentifier,
    })] : []),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
    error: "/login",
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
    async jwt({ token, user }) {
      // On sign-in, hydrate token from the user record.
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "USER";
        return token;
      }
      // Read current authorization on every session resolution. Never trust stale JWT roles.
      if (token.sub) {
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: { role: true, name: true },
        });
        if (!dbUser) return null;
        token.role = dbUser.role;
        token.name = dbUser.name;
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
