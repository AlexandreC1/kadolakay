import { recordOperationalEvent } from "./operational-events";
import NextAuth from "next-auth";
import { brandEmailSender } from "./brand";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import GitHub from "next-auth/providers/github";
import { getAuthAvailability, safeAuthRedirect } from "./auth-config";
import { normalizeEmailIdentifier } from "./auth-email";
import { encryptedAuthAdapter } from "./encrypted-auth-adapter";
import {
  createDeviceSession,
  resolveDeviceSession,
} from "@/services/device-sessions";

import type { Role } from "@prisma/client";

import { resolveSessionClaims } from "./session-claims";

let nextAuthFailureLogAt=0;
function authFailure(){if(Date.now()<nextAuthFailureLogAt)return;nextAuthFailureLogAt=Date.now()+15000;recordOperationalEvent("authentication_failed",{outcome:"failed"});}
const availability = getAuthAvailability(process.env);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter is typed against @auth/core/adapters but our type augmentation
  // narrows next-auth's AdapterUser. Cast bridges the structurally identical types.
  adapter: encryptedAuthAdapter(),
  logger:{error(){authFailure();},warn(){authFailure();},debug(){}},
  // JWT sessions are required so middleware can read role at the edge
  // (Prisma adapter cannot run in edge runtime).
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers: [
    ...(availability.social.includes("google")
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
    ...(availability.social.includes("microsoft-entra-id")
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer:
              process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ||
              "https://login.microsoftonline.com/common/v2.0/",
          }),
        ]
      : []),
    ...(availability.social.includes("github")
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
    ...(availability.email
      ? [
          Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: brandEmailSender(process.env.AUTH_RESEND_FROM),
            maxAge: 15 * 60,
            normalizeIdentifier: normalizeEmailIdentifier,
          }),
        ]
      : []),
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
      const id = user?.id ?? token.sub;
      if (!id) return null;
      const device = user
        ? await createDeviceSession(id)
        : await resolveDeviceSession(id, token.deviceSessionId);
      if (!device) return null;
      const resolved = resolveSessionClaims(token, device.user, Boolean(user));
      return resolved
        ? { ...resolved, deviceSessionId: device.deviceId }
        : null;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.deviceSessionId =
          typeof token.deviceSessionId === "string"
            ? token.deviceSessionId
            : undefined;
        session.user.id = (token.id as string) ?? token.sub ?? session.user.id;
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
});
