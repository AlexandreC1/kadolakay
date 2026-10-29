import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import { checkRateLimit } from "./lib/rate-limit";
import { contentSecurityPolicy } from "./lib/security";
import { rateLimitClientKey } from "./lib/client-ip";
const intlMiddleware = createIntlMiddleware(routing);
const ADMIN = /^\/(?:ht|fr|en)\/admin(?:\/|$)/;
const BUSINESS = /^\/(?:ht|fr|en)\/business\/(?:dashboard|products|orders)(?:\/|$)/;
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isAuthWrite = pathname.startsWith("/api/auth/") && req.method === "POST";
  const isWebhook = pathname.startsWith("/api/webhooks/");
  if (isApi || req.method === "POST") {
    const kind = isWebhook ? "webhook" : isAuthWrite ? "auth" : "general";
    const result = await checkRateLimit(kind, rateLimitClientKey(req.headers));
    if (!result.ok) return NextResponse.json({ error: result.unavailable ? "Service temporarily unavailable. Please try again shortly." : "Too many requests. Please wait a minute and try again." }, {
      status: result.unavailable ? 503 : 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))), "Cache-Control": "no-store" },
    });
  }
  if (isApi) return NextResponse.next();
  const needsAdmin = ADMIN.test(pathname);
  const needsBusiness = BUSINESS.test(pathname);
  if (needsAdmin || needsBusiness) {
    const secure = req.nextUrl.protocol === "https:";
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: secure ? "__Secure-authjs.session-token" : "authjs.session-token" });
    // This is only a navigation hint. Every sensitive query/action rechecks DB permissions.
    if (!token) {
      const locale = pathname.split("/")[1];
      const login = new URL(`/${locale}/login`, req.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "production");
  req.headers.set("x-nonce", nonce);
  req.headers.set("Content-Security-Policy", csp);
  const response = intlMiddleware(req);
  response.headers.set("Content-Security-Policy", csp);
  const overrides = new Set((response.headers.get("x-middleware-override-headers") ?? "").split(",").filter(Boolean));
  overrides.add("x-nonce"); overrides.add("content-security-policy");
  response.headers.set("x-middleware-override-headers", [...overrides].join(","));
  response.headers.set("x-middleware-request-x-nonce", nonce);
  response.headers.set("x-middleware-request-content-security-policy", csp);
  return response;
}
export const config = { matcher: ["/", "/(ht|fr|en)/:path*", "/api/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"] };
