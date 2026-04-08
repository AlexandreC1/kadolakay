import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Route prefixes (after the locale segment) that require role gating.
// e.g. /en/admin, /ht/admin/users, /fr/business/dashboard
const ADMIN_PREFIX = /^\/(?:ht|fr|en)\/admin(?:\/|$)/;
const BUSINESS_PREFIX = /^\/(?:ht|fr|en)\/business(?:\/|$)/;

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAdmin = ADMIN_PREFIX.test(pathname);
  const needsBusiness = BUSINESS_PREFIX.test(pathname);

  if (needsAdmin || needsBusiness) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      // Auth.js v5 cookie name (prefixed in production).
      cookieName:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
    });

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role;
    if (needsAdmin && role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/404", req.url));
    }
    if (needsBusiness && role !== "BUSINESS_OWNER" && role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/404", req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(ht|fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
