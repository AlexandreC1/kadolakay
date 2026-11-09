import { ZodError } from "zod";
import { rateLimitClientKey } from "@/lib/client-ip";
import { verifyGoogleIdToken } from "@/lib/google-id-token";
import { bearerToken } from "@/lib/mobile-token";
import { checkRateLimit } from "@/lib/rate-limit";
import { CatalogSelectionError } from "@/services/registry-catalog";
import { finishOnboarding, saveOnboardingProfile } from "@/services/onboarding";
import {
  MobileAuthError, createMobileSession, mobileUserDto, requireMobileActor, resolveMobileSession, revokeMobileSession,
  signInWithGoogle, startEmailSignIn, verifyEmailSignIn,
} from "@/services/mobile-auth";
import { PledgeError, cancelPledge, listOwnPledges, pledgeGift } from "@/services/pledges";
import {
  addGifts, catalog, createList, listMine, myShop, publicLists, publishList, removeGift, searchLists, setMostWanted, setStock, updateList, viewList,
} from "@/services/mobile-api";
import { db } from "@/lib/db";

/**
 * JSON API for the Bayou mobile app, at /api/mobile/v1/*. Bearer-token sessions
 * (see services/mobile-auth.ts); every write reuses the web's services, so the
 * same ownership, validation and locking rules apply. Errors are stable codes.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
type Ctx = { params: Promise<{ path: string[] }> };

async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 20000) throw new ZodError([]);
  if (!text) return {};
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ZodError([]);
  return value as Record<string, unknown>;
}

function fail(error: unknown) {
  if (error instanceof SyntaxError || error instanceof ZodError) return json({ error: "INVALID_INPUT" }, 400);
  if (error instanceof MobileAuthError) {
    const status = { SIGNED_OUT: 401, FORBIDDEN: 403, SUSPENDED: 403, INVALID_CODE: 400, INVALID_EMAIL: 400, TOO_MANY_CODES: 429, EMAIL_UNAVAILABLE: 503 }[error.code];
    return json({ error: error.code }, status);
  }
  if (error instanceof PledgeError) return json({ error: error.code }, error.code === "NOT_FOUND" ? 404 : error.code === "INVALID" ? 400 : 409);
  if (error instanceof CatalogSelectionError) return json({ error: error.code }, error.code === "INVALID_SELECTION" ? 400 : 409);
  const message = error instanceof Error ? error.message : "";
  if (/not found/i.test(message)) return json({ error: "NOT_FOUND" }, 404);
  if (message === "Add at least one gift before publishing") return json({ error: "NEEDS_GIFT" }, 409);
  if (message === "Gifts with checkout or payment history cannot be changed") return json({ error: "GIFT_LOCKED" }, 409);
  if (message === "Forbidden") return json({ error: "FORBIDDEN" }, 403);
  console.error("Mobile API request failed");
  return json({ error: "UNAVAILABLE" }, 500);
}

const base = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function handle(req: Request, ctx: Ctx) {
  const path = (await ctx.params).path;
  const token = bearerToken(req.headers);
  const [a, b, c, d, e] = path;

  // Sign-in endpoints carry their own, stricter limit on top of the proxy's.
  if (a === "auth" && req.method === "POST") {
    const limit = await checkRateLimit("auth", `mobile:${rateLimitClientKey(req.headers)}`);
    if (!limit.ok) return json({ error: limit.unavailable ? "UNAVAILABLE" : "RATE_LIMITED" }, limit.unavailable ? 503 : 429);
  }

  switch (true) {
    /* ---- Sign-in ---- */
    case req.method === "POST" && a === "auth" && b === "email" && c === "start" && !d: {
      const input = await body(req);
      await startEmailSignIn(input.email, input.locale);
      return json({ ok: true });
    }
    case req.method === "POST" && a === "auth" && b === "email" && c === "verify" && !d: {
      const input = await body(req);
      const userId = await verifyEmailSignIn(input.email, input.code, input.locale);
      return signedIn(userId, input.device);
    }
    case req.method === "POST" && a === "auth" && b === "google" && !c: {
      const input = await body(req);
      let identity;
      try { identity = await verifyGoogleIdToken(String(input.idToken ?? "")); }
      catch (error) { return json({ error: error instanceof Error && error.message === "GOOGLE_NOT_CONFIGURED" ? "UNAVAILABLE" : "INVALID_TOKEN" }, error instanceof Error && error.message === "GOOGLE_NOT_CONFIGURED" ? 503 : 401); }
      return signedIn(await signInWithGoogle(identity, input.locale), input.device);
    }
    case req.method === "POST" && a === "auth" && b === "sign-out" && !c:
      await revokeMobileSession(token);
      return json({ ok: true });

    /* ---- Me ---- */
    case req.method === "GET" && a === "me" && !b: {
      const s = await resolveMobileSession(token);
      return s ? json({ user: mobileUserDto(s.user) }) : json({ error: "SIGNED_OUT" }, 401);
    }
    case req.method === "PATCH" && a === "me" && !b: {
      const s = await requireMobileActor(token, "onboarding:profile");
      const input = await body(req);
      const name = typeof input.name === "string" && input.name.trim() ? input.name : s.user.name ?? "";
      await saveOnboardingProfile(s.user.id, { name, locale: input.locale ?? s.user.preferredLocale });
      return json({ ok: true });
    }
    case req.method === "POST" && a === "me" && b === "onboarding" && !c: {
      const s = await requireMobileActor(token, "onboarding:finish");
      const input = await body(req);
      await finishOnboarding(s.user.id, { choice: input.choice, locale: input.locale ?? s.user.preferredLocale });
      return json({ ok: true });
    }
    case req.method === "GET" && a === "me" && b === "pledges" && !c: {
      const s = await requireMobileActor(token, "gift:pledge");
      const rows = await listOwnPledges(s.user.id);
      return json({
        pledges: rows.map((p) => ({
          id: p.id, quantity: p.quantity, message: p.message ?? undefined, anonymous: p.isAnonymous, createdAt: p.createdAt.toISOString(),
          gift: { id: p.item.id, title: p.item.title, priceHTG: p.item.priceHTG === null ? undefined : Number(p.item.priceHTG), priceUSD: p.item.priceUSD === null ? undefined : Number(p.item.priceUSD), productId: p.item.productId ?? undefined, businessSlug: p.item.business?.slug },
          list: { slug: p.registry.slug, title: p.registry.title, ownerName: p.registry.user.name ?? "" },
        })),
      });
    }

    /* ---- Lists ---- */
    case req.method === "GET" && a === "lists" && b === "mine" && !c: {
      const s = await requireMobileActor(token, "registry:create");
      return json({ lists: await listMine(s.user.id) });
    }
    case req.method === "GET" && a === "lists" && b === "search" && !c: {
      const q = new URL(req.url).searchParams.get("q") ?? "";
      return json({ lists: await searchLists(q, base()) });
    }
    case req.method === "GET" && a === "lists" && b === "public" && !c:
      return json({ lists: await publicLists(new URL(req.url).searchParams.get("type")) });
    case req.method === "POST" && a === "lists" && !b: {
      const s = await requireMobileActor(token, "registry:create");
      return json(await createList(s.user.id, await body(req)), 201);
    }
    case req.method === "GET" && a === "lists" && !!b && !c: {
      const s = await resolveMobileSession(token);
      const list = await viewList(b, s?.user.id ?? null);
      return list ? json({ list }) : json({ error: "NOT_FOUND" }, 404);
    }
    case req.method === "PATCH" && a === "lists" && !!b && !c: {
      const s = await requireMobileActor(token, "registry:update");
      return json(await updateList(s.user.id, b, await body(req)));
    }
    case req.method === "POST" && a === "lists" && !!b && c === "publish" && !d: {
      const s = await requireMobileActor(token, "registry:publish");
      await publishList(s.user.id, b);
      return json({ ok: true });
    }
    case req.method === "POST" && a === "lists" && !!b && c === "gifts" && !d: {
      const s = await requireMobileActor(token, "item:add");
      await addGifts(s.user.id, b, await body(req));
      return json({ ok: true }, 201);
    }
    case req.method === "DELETE" && a === "lists" && !!b && c === "gifts" && !!d && !e: {
      const s = await requireMobileActor(token, "item:remove");
      await removeGift(s.user.id, b, d);
      return json({ ok: true });
    }
    case req.method === "POST" && a === "lists" && !!b && c === "gifts" && !!d && e === "priority": {
      const s = await requireMobileActor(token, "item:update");
      const input = await body(req);
      await setMostWanted(s.user.id, b, d, input.wanted === true);
      return json({ ok: true });
    }
    case req.method === "POST" && a === "lists" && !!b && c === "gifts" && !!d && e === "pledge": {
      const s = await requireMobileActor(token, "gift:pledge");
      // The gift must belong to the list in the path; the service checks the list itself.
      const owner = await db.registryItem.findFirst({ where: { id: d, registry: { slug: b } }, select: { id: true } });
      if (!owner) return json({ error: "NOT_FOUND" }, 404);
      const pledge = await pledgeGift(s.user.id, d, await body(req));
      return json({ pledge: { id: pledge.id } }, 201);
    }
    case req.method === "DELETE" && a === "pledges" && !!b && !c: {
      const s = await requireMobileActor(token, "gift:pledge");
      await cancelPledge(s.user.id, b);
      return json({ ok: true });
    }

    /* ---- Catalog ---- */
    case req.method === "GET" && a === "catalog" && !b:
      return json(await catalog());

    /* ---- Shop owner ---- */
    case req.method === "GET" && a === "shop" && !b: {
      const s = await requireMobileActor(token, "product:edit");
      const shop = await myShop(s.user.id);
      return shop ? json({ shop }) : json({ error: "NOT_FOUND" }, 404);
    }
    case req.method === "PATCH" && a === "shop" && b === "products" && !!c && d === "stock": {
      const s = await requireMobileActor(token, "product:edit");
      const input = await body(req);
      const value = input.stockQuantity;
      if (value !== null && typeof value !== "number") return json({ error: "INVALID_INPUT" }, 400);
      await setStock(s.user.id, c, value);
      return json({ ok: true });
    }
  }
  return json({ error: "NOT_FOUND" }, 404);
}

async function signedIn(userId: string, device: unknown) {
  const token = await createMobileSession(userId, typeof device === "string" ? device : undefined);
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, preferredLocale: true, onboardingCompletedAt: true, onboardingDeferredAt: true, business: { select: { slug: true, status: true } } },
  });
  return json({ token, user: mobileUserDto(user) });
}

async function run(req: Request, ctx: Ctx) {
  try { return await handle(req, ctx); } catch (error) { return fail(error); }
}
export const GET = run, POST = run, PATCH = run, DELETE = run;
