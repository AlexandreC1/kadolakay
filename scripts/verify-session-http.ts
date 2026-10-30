import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { encode } from "next-auth/jwt";
import { db } from "../src/lib/db";
import { revokeOwnSessions } from "../src/services/sessions";
import {
  grantPremium,
  personalizeRegistry,
  revokePremium,
} from "../src/services/product-foundations";

async function main() {
  const url = new URL(
    process.env.DATABASE_URL ?? "postgresql://invalid/invalid",
  );
  assert.equal(
    process.env.RUN_SESSION_HTTP_TESTS,
    "1",
    "Explicit test opt-in required",
  );
  assert(
    ["127.0.0.1", "localhost"].includes(url.hostname) &&
      url.pathname.endsWith("_test"),
    "Disposable loopback _test database required",
  );
  // NextURL normalizes loopback IPs to localhost. Use the canonical host so
  // the default-locale rewrite remains internal rather than a proxy roundtrip.
  const socket = createServer();
  socket.listen(0, "localhost");
  await once(socket, "listening");
  const address = socket.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const base = `http://localhost:${port}`;
  const secret = randomBytes(48).toString("base64url");
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "localhost",
      "--port",
      String(port),
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        AUTH_SECRET: secret,
        AUTH_URL: base,
        NEXTAUTH_URL: base,
        AUTH_TRUST_HOST: "true",
        NEXT_PUBLIC_APP_URL: base,
        AUTH_GOOGLE_ID: "fixture.apps.googleusercontent.com",
        AUTH_GOOGLE_SECRET: "fixture-only",
        NEXT_TELEMETRY_DISABLED: "1",
        CHECKOUT_ENABLED: "false",
        RECONCILIATION_ENABLED: "false",
        PAYMENT_MODE: "disabled",
        SENTRY_DSN: "",
        NEXT_PUBLIC_SENTRY_DSN: "",
        SENTRY_AUTH_TOKEN: "",
        AUTH_RESEND_KEY: "",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
      },
    },
  );
  let ready = false;
  child.stdout.on("data", (data: Buffer) => {
    if (data.toString().includes("Ready")) ready = true;
  });
  child.stderr.on("data", () => {
    /* Never print auth/runtime diagnostics or cookies. */
  });
  let userId: string | undefined;
  let checks = 0;
  const passed = (name: string) => {
    checks++;
    console.log(`PASS ${name}`);
  };
  try {
    for (let i = 0; i < 150 && !ready; i++) {
      assert.equal(
        child.exitCode,
        null,
        "Test server exited before becoming ready",
      );
      await delay(200);
    }
    assert(ready, "Test server did not become ready");
    const owner = await db.user.create({
      data: {
        email: `${randomUUID()}@example.invalid`,
        name: "Session fixture <script>alert(1)</script>",
      },
    });
    userId = owner.id;
    const cookie = async (version?: number) =>
      `authjs.session-token=${await encode({
        secret,
        salt: "authjs.session-token",
        maxAge: 3600,
        token: {
          sub: owner.id,
          id: owner.id,
          role: "SUPERADMIN",
          ...(version === undefined ? {} : { sessionVersion: version }),
        },
      })}`;
    const request = (path: string, value?: string) =>
      fetch(`${base}${path}`, {
        redirect: "manual",
        headers: value ? { Cookie: value } : {},
      });
    // Next may already be streaming: denial then uses a documented meta
    // redirect with HTTP 200. Require the real login target and no settings UI.
    async function denied(response: Response, expected = "/login") {
      const html = await response.text();
      assert([200, 307].includes(response.status));
      const target =
        response.headers.get("location") ??
        html.match(
          /<meta[^>]*http-equiv="refresh"[^>]*content="\d+;url=([^\"]+)"/,
        )?.[1];
      assert(target, "No authentication redirect was emitted");
      const destination = new URL(target.replaceAll("&amp;", "&"), base);
      assert.equal(destination.origin, base);
      assert.equal(destination.pathname, expected);
      assert(
        !/aria-label="(?:Session security|Sécurité des sessions|Sekirite sesyon yo)"/.test(
          html,
        ),
        "Protected settings form was rendered to a denied session",
      );
    }
    await denied(await request("/en/settings"));
    passed(
      "unauthenticated settings access redirects without rendering protected data",
    );
    const oldCookie = await cookie(0);
    for(const [path,home] of [["/en","Home"],["/fr","Accueil"],["/","Akèy"]]) {
      const response=await request(path);const html=await response.text();assert.equal(response.status,200);
      assert(html.includes('class="home-entry"'));assert(html.includes(`aria-label="Bayou · ${home}"`));
      assert(!html.includes('background-motion-control'));assert(!html.includes('lakou-finder'));assert(!html.includes('lakou-occasions'));
      passed(`focused homepage and explicit Home navigation without floating playback at ${path}`);
    }
    for (const [path, title] of [
      ["/en/business", "Grow your business with Bayou"],
      ["/fr/business", "Développez votre commerce avec Bayou"],
      ["/business", "Devlope biznis ou ak Bayou"],
      ["/en/premium", "Bayou Premium"],
      ["/en/appearance", "Seasonal presentation"],
    ]) {
      const response = await request(path);
      assert.equal(response.status, 200);
      assert((await response.text()).includes(title));
      passed(`public product entry renders at ${path}`);
    }
    const anonymousSignup = await request("/fr/business/signup");
    const signupHtml = await anonymousSignup.text();
    assert(anonymousSignup.status === 307 || signupHtml.includes("/fr/login"));
    assert(!signupHtml.includes('name="patenteNumber"'));
    passed(
      "anonymous merchant signup preserves the French login path without rendering the form",
    );
    const noPremium = await request("/en/premium/manage", oldCookie);
    assert.equal(noPremium.status, 200);
    assert(!(await noPremium.text()).includes('class="premium-insights"'));
    passed("ordinary users do not receive Premium aggregates");
    const deniedPremiumAdmin = await request("/en/admin/premium", oldCookie);
    const deniedPremiumHtml = await deniedPremiumAdmin.text();
    assert(!deniedPremiumHtml.includes('name="targetId"'));
    passed("forged superadmin cookie claim cannot render grant controls");
    const discovery = await request(
      "/en/discover?budget=25&currency=USD&occasion=VALENTINE",
    );
    assert.equal(discovery.status, 200);
    assert(
      (await discovery.text()).includes(
        "Gift suggestions are temporarily unavailable",
      ),
    );
    passed(
      "production recommendation search fails closed when shared rate limiting is absent",
    );
    const malformed = await request("/en/discover?budget=-1");
    assert.equal(malformed.status, 200);
    assert((await malformed.text()).includes("Enter a budget from"));
    passed("malformed discovery budget produces localized validation feedback");
    await db.user.update({
      where: { id: owner.id },
      data: { role: "SUPERADMIN" },
    });
    const admin = await request("/en/admin/premium", oldCookie);
    assert.equal(admin.status, 200);
    assert((await admin.text()).includes('name="targetId"'));
    passed("fresh database superadmin role renders audited pilot controls");
    await grantPremium(owner.id, owner.id, new Date(Date.now() + 86400000));
    const registry = await db.registry.create({
      data: {
        userId: owner.id,
        title: "HTTP palette fixture",
        slug: `http-palette-${randomUUID()}`,
        type: "WEDDING",
        status: "PUBLISHED",
        items: {
          create: { title: "Gift fixture", quantity: 3, fulfilledQty: 1 },
        },
      },
    });
    await personalizeRegistry(owner.id, registry.id, "rose");
    const manage = await request("/en/premium/manage", oldCookie);
    const manageHtml = await manage.text();
    assert.equal(manage.status, 200);
    assert(manageHtml.includes('class="premium-insights"'));
    assert(manageHtml.includes("HTTP palette fixture"));
    passed(
      "active entitlement renders owned palettes and database aggregate insights",
    );
    const wishlist = await request(`/en/r/${registry.slug}`);
    assert.equal(wishlist.status, 200);
    assert((await wishlist.text()).includes('data-palette="rose"'));
    passed("eligible public registry displays its saved Premium palette");
    await revokePremium(owner.id, owner.id);
    const expired = await request(`/en/r/${registry.slug}`);
    assert.equal(expired.status, 200);
    assert((await expired.text()).includes('data-palette="mint"'));
    passed("revocation immediately restores public mint presentation");
    const business = await db.business.create({
      data: {
        ownerId: owner.id,
        name: "HTTP merchant fixture",
        slug: `http-merchant-${randomUUID()}`,
        category: "home",
        status: "PENDING_REVIEW",
      },
    });
    const merchantPayment = await request("/en/business/payments", oldCookie);
    assert.equal(merchantPayment.status, 200);
    assert(
      (await merchantPayment.text()).includes(
        "Saving this preference does not connect an account",
      ),
    );
    passed("merchant setup states explicitly that collection is unavailable");
    assert(business.id);
    const existingSignup = await request("/fr/business/signup", oldCookie);
    const existingSignupHtml = await existingSignup.text();
    assert(
      existingSignup.status === 307 ||
        existingSignupHtml.includes("/fr/business/dashboard"),
    );
    assert(!existingSignupHtml.includes('name="patenteNumber"'));
    passed(
      "existing merchants return to their dashboard instead of registering again",
    );
    await db.user.update({ where: { id: owner.id }, data: { role: "USER" } });
    const initial = await request("/en/settings", oldCookie);
    assert.equal(initial.status, 200);
    const html = await initial.text();
    assert(
      html.includes('aria-label="Session security"'),
      "Authenticated settings form was not rendered",
    );
    assert(!html.includes("<script>alert(1)</script>"));
    passed(
      "real encrypted fixture cookie renders settings with escaped profile text",
    );
    for (const [path, label] of [
      ["/fr/settings", "Sécurité des sessions"],
      ["/settings", "Sekirite sesyon yo"],
    ]) {
      const localized = await request(path, oldCookie);
      assert.equal(localized.status, 200);
      assert((await localized.text()).includes(`aria-label="${label}"`));
      passed(`localized session control renders at ${path}`);
    }
    await denied(
      await request("/en/admin/businesses", oldCookie),
      "/dashboard",
    );
    passed("stale elevated cookie claims do not grant administrator access");
    await denied(await request("/en/settings", await cookie()));
    passed("legacy cookie without a revocation version is rejected");
    await revokeOwnSessions(owner.id);
    for (const path of ["/en/settings", "/fr/settings", "/settings"])
      await denied(await request(path, oldCookie));
    passed(
      "previously valid copied cookie is rejected across all locales after revocation",
    );
    const fresh = await request("/en/settings", await cookie(1));
    assert.equal(fresh.status, 200);
    assert((await fresh.text()).includes('aria-label="Session security"'));
    passed("fresh sign-in version can access settings again");
    console.log(
      `${checks} production-server session and product checks passed`,
    );
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([once(child, "exit"), delay(5000)]);
    }
    if (userId) await db.user.delete({ where: { id: userId } });
  }
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Session HTTP verification failed",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
