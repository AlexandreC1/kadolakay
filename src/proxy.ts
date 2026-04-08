import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import { checkRateLimit } from "./lib/rate-limit";

const intlMiddleware = createIntlMiddleware(routing);

// Route prefixes (after the locale segment) that require role gating.
// e.g. /en/admin, /ht/admin/users, /fr/business/dashboard
const ADMIN_PREFIX = /^\/(?:ht|fr|en)\/admin(?:\/|$)/;
const BUSINESS_PREFIX = /^\/(?:ht|fr|en)\/business(?:\/|$)/;
const AUTH_PREFIX = /^\/api\/auth\//;
const WEBHOOK_PREFIX = /^\/api\/webhooks\//;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

function tooManyRequests(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  });
}

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// Export name must be `proxy`, not default.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rate limiting ──────────────────────────────────────────────────────
  // Auth and webhook endpoints are the highest-value targets, so we gate
  // them at the edge before they ever touch a Node runtime.
  if (AUTH_PREFIX.test(pathname)) {
    const r = await checkRateLimit("auth", clientIp(req));
    if (!r.ok) return tooManyRequests(r.reset);
  } else if (WEBHOOK_PREFIX.test(pathname)) {
    const r = await checkRateLimit("webhook", clientIp(req));
    if (!r.ok) return tooManyRequests(r.reset);
  }

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
  matcher: [
    "/",
    "/(ht|fr|en)/:path*",
    // Rate-limit auth + webhooks at the edge.
    "/api/auth/:path*",
    "/api/webhooks/:path*",
    // Everything else that isn't a static asset or other API route.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
