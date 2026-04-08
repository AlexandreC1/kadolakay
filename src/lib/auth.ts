import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { Role } from "@prisma/client";
import { db } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter is typed against @auth/core/adapters but our type augmentation
  // narrows next-auth's AdapterUser. Cast bridges the structurally identical types.
  adapter: PrismaAdapter(db) as Adapter,
  // JWT sessions are required so middleware can read role at the edge
  // (Prisma adapter cannot run in edge runtime).
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      from: process.env.AUTH_RESEND_FROM || "KadoLakay <noreply@kadolakay.com>",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, hydrate token from the user record.
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "USER";
        return token;
      }
      // On session refresh, re-read role so promotions/demotions take effect
      // without forcing the user to sign back in.
      if (trigger === "update" || !token.role) {
        if (token.sub) {
          const dbUser = await db.user.findUnique({
            where: { id: token.sub },
            select: { role: true },
          });
          if (dbUser) token.role = dbUser.role;
        }
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
