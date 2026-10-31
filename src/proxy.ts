import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import { checkRateLimit, getClientIp } from "./lib/rate-limit";

const intlMiddleware = createIntlMiddleware(routing);

// Route prefixes (after the locale segment) that require role gating.
// e.g. /en/admin, /ht/admin/users, /fr/business/dashboard
const ADMIN_PREFIX = /^\/(?:ht|fr|en)\/admin(?:\/|$)/;
const BUSINESS_PREFIX = /^\/(?:ht|fr|en)\/business(?:\/|$)/;
// Only credential-bearing auth endpoints are limited; GET /api/auth/session
// and /csrf run on every page view and must never 429 (review M2).
const AUTH_LIMITED = /^\/api\/auth\/(signin|callback)(\/|$)/;
const WEBHOOK_PREFIX = /^\/api\/webhooks\//;


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
  if (req.method === "POST" && AUTH_LIMITED.test(pathname)) {
    const r = await checkRateLimit("auth", getClientIp(req.headers));
    if (!r.ok) return tooManyRequests(r.reset);
  } else if (WEBHOOK_PREFIX.test(pathname)) {
    const r = await checkRateLimit("webhook", getClientIp(req.headers));
    if (!r.ok) return tooManyRequests(r.reset);
  }

  // API routes are matched only for the rate limits above. They must not
  // reach the locale middleware, which would rewrite /api/auth/... to
  // /ht/api/auth/... and 404 every sign-in and payment webhook.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const needsAdmin = ADMIN_PREFIX.test(pathname);
  const needsBusiness = BUSINESS_PREFIX.test(pathname);

  if (needsAdmin || needsBusiness) {
    // Let Auth.js derive the cookie name from the request scheme (review L6):
    // __Secure- prefix on https, plain name on http (local / http previews).
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: req.nextUrl.protocol === "https:",
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
    // Everything else that isn't a static asset, API route, or the Sentry
    // tunnel (/monitoring must not be locale-redirected, review L4).
    "/((?!api|_next|_vercel|monitoring|.*\\..*).*)",
  ],
};
