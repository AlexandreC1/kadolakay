> Historical plan from before the scope reset. Superseded by IMPLEMENTATION-PLAN.md, DECISIONS.md, and HANDOFF.md. The former homepage was rejected, checkout is now explicitly opt-in, and the free pilot targets Netlify rather than Vercel. Do not interpret the following as current release acceptance.

# KadoLakay release plan

Prepared 25 October 2026. This is a staged release plan with explicit pass/fail gates. A passing unit test suite is not proof that a live provider account or deployment works.

## Product and brand

KadoLakay connects people in Haiti with relatives abroad through shared gift registries. The interface must feel professional, welcoming and grounded in real family occasions. Use Haitian Creole, French and English consistently. Prioritize mobile devices and constrained networks.

The user-confirmed visual direction is contemporary Caribbean: ocean blue, sand and bright coral. The KadoLakay wordmark has no trailing period. The redesign uses custom ribbon-and-home SVG artwork, clear retail typography and a tactile CSS 3D gift that opens on click, tap or keyboard. It includes reduced-motion handling. No generated stock imagery, decorative fake statistics or invented testimonials. The scene adds no Three.js or Spline bundle. User-facing copy should avoid em dashes and exaggerated claims.

## Gate 1: establish a real baseline

- Inventory routes, external dependencies, schema, environment names and test coverage.
- Run existing unit tests and TypeScript before changes.
- Start an isolated PostgreSQL database. Apply committed migrations and seed local demo data only.
- Keep secrets out of source, client props, logs and deliverable archives.

Evidence: original 15 tests and TypeScript passed. Local PostgreSQL 18 is running on loopback port 55432. Existing migrations and the reservation/index migration applied. Demo records exist locally. Production must use its own empty database and must not run the demo seed.

## Gate 2: business rules and payment integrity

The MVP accepts card payments through Stripe Checkout. Other payment methods stay unavailable until their real verification flow is implemented and accepted.

Rules:

1. Prices originate on the server. Use integer cents for arithmetic, exact decimal database values, and the exact payment currency. USD is the payable MVP currency. Do not turn an estimated HTG conversion into a payment amount.
2. Every selected gift belongs to one published, public, unprotected registry. Reject missing, external, unavailable or duplicate item selections and invalid quantities.
3. Recheck local business approval, catalog availability and price agreement. A changed price must be rejected so it is never silently charged.
4. Reserve remaining registry quantities with a conditional SQL update inside a transaction. Lock inventory and apply database CHECK constraints. Keep reservation and fulfillment totals within requested quantity.
5. A signed, paid Stripe event must match the stored session, amount, currency and order. Complete payment, order and stock in the same transaction. Concurrent event deliveries must not repeat fulfillment.
6. Release an unpaid reservation once after provider-confirmed expiry. On an ambiguous network timeout, keep the hold until provider reconciliation determines whether a payable session exists.
7. Run authenticated reconciliation every five minutes. Alert on reconciliation failure and unusually old holds.
8. Preserve financial history. Archive registries; prohibit modifying or deleting gifts with reservations or order history. External purchase confirmation requires registry ownership.
9. A receipt must prove possession of its provider session. An enumerable order number alone must never reveal buyer details.
10. Registry quantity is a gift-list commitment, not a retailer-wide warehouse inventory system.

Gate tests: many simultaneous buyers for the last unit; duplicate and reordered webhook events; amount/currency tampering; cancellation versus payment race; expired holds; unavailable products; price changes; transaction rollback. Actual PostgreSQL tests passed for the implemented cases. Stripe's network boundary is mocked in database tests, so a real test-mode checkout remains mandatory.

Commercial scope: money currently reaches the platform's merchant account. Automatic payouts to local vendors or registry owners are not implemented. Before accepting live money, identify the merchant of record and agree delivery, refunds, disputes, taxes and vendor settlement. Stripe requires a legitimately eligible merchant account in a supported country. Haiti is not listed for direct Stripe merchant onboarding. Never use a false business address.

## Gate 3: security and data privacy

Implemented work:

- Auth.js supports configured Google, Microsoft and GitHub identities. Hide unconfigured providers. Email login only reports success after the provider accepts the request.
- OAuth callbacks return only to the application's origin. Normalize email before validation. Read actor identity from the session and current privileges from the database.
- Runtime schemas reject extra fields, dangerous URL schemes, invalid dates, fractional quantities, bad monetary precision and malformed data.
- Owner-scoped registry mutations and minimum public data transfer objects prevent private data exposure. Public registry and OG queries exclude drafts, archived, private and password-protected records.
- Use parameterized Prisma/SQL statements. Escape user-controlled email HTML. React renders user text rather than raw HTML.
- Nonce-based script CSP, frame restrictions, nosniff, production HTTPS headers and request-size limits provide additional browser defenses. Never weaken script policy to make a broken dependency work.
- Shared Redis rate limits apply to authentication, API traffic and server mutations. Production fails closed when the limiter is missing or unavailable. Local development has a bounded memory limiter.
- Public catalog responses have a short cache lifetime. Private sessions, checkout prices, payment status and inventory decisions remain uncached.
- Add catalog and order relationship indexes. Use pooled connections in serverless production. Investigate slow queries with EXPLAIN ANALYZE against realistic staging data before adding indexes indiscriminately.

Gate tests: unauthenticated mutation, another user's IDs, stale admin role, Unicode email attack, redirect off-site, JavaScript/data URLs, duplicate form fields, private registry/OG access, raw error leakage, nonce policy, rate limit exhaustion and database errors. Run dependency auditing after upgrades. No unresolved critical or high production advisory may be waived silently.

## Gate 4: functional UI and performance

Browser matrix: desktop 1440px, tablet 820px, mobile 390px and narrow 320px; ht/fr/en; keyboard only; reduced motion; constrained network and CPU.

Acceptance checklist:

- Homepage, logo, nav, language switching and primary CTA destinations work.
- Gift opens/closes with pointer, touch and keyboard; reduced motion avoids unwanted tilt.
- No horizontal overflow, blocked overlays, hydration errors, missing translations or runtime errors.
- Google completes actual authorization and returns to the intended same-origin page. Cancelled and denied OAuth requests show a useful error. Microsoft/GitHub undergo the same test when enabled.
- Create a registry, edit it, add a gift, publish, copy/share its link and open it as a guest. Another account cannot edit it.
- Forms show pending/success/error states, recover after failure and resist accidental duplicate submission.
- Product fetching distinguishes an empty catalog from a failed request and allows retry.
- Create a Stripe test checkout, pay successfully, confirm the signed webhook, inspect the receipt, retry the webhook, and verify inventory and order totals in PostgreSQL.
- Test rejected card, user cancellation, expired session, unavailable inventory, duplicate submission and delayed webhook.
- Target LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile. These are acceptance targets, not measured claims. Measure on representative Android hardware and network conditions.
- Record production JS transfer size and the hero's additional chunk size. CSS 3D eliminates a WebGL bundle but does not remove the need to measure the rest of the page.

Stop if a gate fails. Fix the failure, rerun the affected checks, then continue. Do not declare live OAuth or payment tests passed when keys are absent.

## Gate 5: staging, operations and controlled launch

1. Select the domain and hosting account. Set a hard spend limit or alerts before launching.
2. Provision production PostgreSQL with TLS, pooled application connections, a direct migration connection if required, least-privilege roles and a tested backup/restore process.
3. Provision shared rate limiting and inject secrets through hosting settings. Never paste keys into chat or commit .env files.
4. Register exact Google callback origins for localhost, staging and production separately. Add optional SSO callbacks only for providers being enabled.
5. Configure Stripe test keys, signed webhook URL and five-minute reconciliation. Complete all test-mode payment cases first.
6. Publish approved privacy, terms, refund, delivery and support information using the real business identity. Placeholder legal/contact links were removed rather than left broken.
7. Run lint, TypeScript, unit tests, real database tests, dependency scan and production build in CI. Never delete the lockfile to get a green build.
8. Deploy staging and run the browser checklist. Confirm health endpoint readiness, no secrets in client bundles and no sensitive content in error responses.
9. Restore a backup into a separate database and verify access. Set alerts for health failure, payment processing errors, limiter failures and reconciliation lag.
10. Enable live payment keys only after merchant verification. Run a small live payment and refund with the owner's authorization. Confirm settlement destination.
11. Release to a small pilot group. Review errors, slow queries and refunds before opening registration broadly.
12. Roll back application code if needed, but never reverse paid ledger history casually. Keep database migrations backward-compatible and preserve records for reconciliation.

## Budget options

Prices checked against official provider pages on 25 October 2026. Taxes, payment processing, premium domains, renewal changes and usage overages are additional.

### If $50 means initial launch plus first month

| Item | Launch allocation | Ongoing expectation |
|---|---:|---|
| Non-premium .com domain through Cloudflare Registrar | Reserve $12 to $15 for first year | Annual renewal at current registrar price |
| Vercel Pro, one paid seat | $20 for first month | $20/month base plus any metered usage |
| Neon PostgreSQL free allowance | $0 initially | Upgrade or reduce load if compute/storage allowance is reached |
| Upstash Redis free allowance | $0 initially | Watch commands and bandwidth, set budget alerts |
| Reserve | $15 to $18 | Taxes, modest usage or operational needs |
| Total planning allocation | $50 maximum | This does not fund an entire year of hosting |

This is the simplest fit for the current Next.js stack. Vercel Hobby is for non-commercial personal use and must not be treated as free production hosting for this paid registry service. Verify whether Vercel Pro's advertised custom-domain offer applies before purchasing separately; do not count it twice.

Lower monthly option: Render's entry paid web-service tier has been listed at $7/month, but recheck the final configured service price, memory needs, deployment build, scheduled jobs and usage before choosing it. Next.js runs as a Node service, with Neon and Upstash external. One year at $7/month already costs $84 before a domain or operational add-ons.

### If $50 means the whole first year

The paid hosting options above do not fit. A free-tier pilot may fit using Cloudflare Workers/OpenNext, Neon and Upstash plus the domain, but this repository has not been validated on the Workers runtime. Prisma, Auth.js, the nonce proxy, scheduled reconciliation and all payment gates need a separate deployment compatibility test. Do not advertise a dependable, unlimited commercial platform for a one-time $50 spend. Keep the remaining budget as contingency and agree a recurring operating budget before accepting substantial live traffic.

### Domain purchase steps

- Check kadolakay.com first, then an agreed alternative such as kadolakay.app. Availability and final checkout price are not confirmed.
- Prefer a normal-price domain over a premium resale listing. Compare both first-year and renewal prices.
- Register under the business owner's account, enable two-factor authentication, registrar lock and renewal reminders. Keep ownership independent of a contractor's account.
- Add the apex and www hostnames to the selected host, configure its required DNS records and redirect one canonical hostname to the other.
- Wait for TLS to become valid before enabling production OAuth callbacks or live payments.

Sources:
- Vercel pricing: https://vercel.com/pricing
- Vercel commercial-use restriction: https://vercel.com/docs/plans/hobby
- Neon pricing and free allowances: https://neon.com/pricing
- Upstash Redis pricing: https://upstash.com/pricing/redis
- Cloudflare domain prices: https://pricing.registrar.cloudflare.com/
- Render pricing: https://render.com/pricing
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Stripe merchant countries: https://stripe.com/global

## Information needed from the owner

- Whether $50 is an initial-month budget or an annual total.
- Merchant legal country and eligible payment-provider account.
- Google OAuth setup and desired Microsoft/GitHub options. Enter actual secrets in the local environment or host secret settings.
- Chosen domain, owner-controlled hosting account and permission to make the concrete purchase after seeing its final price.
- Real support contact, merchant identity, delivery/refund policy and vendor settlement procedure.

These are concrete external release dependencies. Code changes alone cannot manufacture a Google OAuth client, merchant approval, a purchased domain or a successful live payment.
