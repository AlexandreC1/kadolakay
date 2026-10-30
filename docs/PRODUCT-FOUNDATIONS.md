# Product foundations, October 30, 2026

Owner priorities: payment foundations without credentials/endpoints, Premium personalization and registry insights, dedicated merchant acquisition/onboarding, budget/occasion recommendations and seasonal presentation. Netlify work is paused.

## Delivery gates

1. Payment contracts and merchant readiness: strict minor-unit money, merchant recipient binding, unavailable-by-default adapters; private owner setup page. No fabricated provider endpoints, live collection, or self-certified verification. Existing sandbox recovery is preserved.
2. Premium: expiring, server-authoritative entitlements separate from roles; owner-only registry palettes and aggregate insights. No price, automatic trial, paid subscription or self-upgrade. An audited SUPERADMIN grant supports controlled pilot access.
3. Merchant entry: public business landing page, localized authenticated signup, existing-account recovery and a merchant checklist. Existing patente validation and approval rules remain authoritative.
4. Discovery: currency-specific budget and occasion filters, approved merchants and confirmed stock, bounded database selection, deterministic explainable ranking. Seasonal calendar runs in America/Port-au-Prince; visitor can opt out. Commemorations are editorial, not automatic sales events. No AI API, behavioral tracking, polling, or scheduler required.

## Acceptance

Each gate requires permission/ownership/strict-input tests and failure states. Additive migrations run only on a disposable test database before any owner-data migration. Full unit and PostgreSQL suites, typecheck, lint, production build and relevant HTTP/browser paths follow. Document measured limits and unverified external-provider behavior explicitly.

## Cost and query budgets

No new runtime dependency. Discovery returns at most 12 products from at most 96 candidates, with a bounded budget query and explicit fallback. Insights use aggregate SQL, never load guest identities or order histories. Entitlements and private merchant readiness are not shared-cache data. Public catalog caches must never authorize inventory/payment. CSS seasons and per-request date selection do not add animation loops or cron jobs. No paid upgrades or hosting work in this milestone.

## Implemented entry points

| Entry | Behavior |
| --- | --- |
| /business | Public merchant explanation, preparation checklist and existing-business recovery. |
| /business/signup | Dedicated authenticated registration; locale-preserving login/redirects; patente/strict validation/review preserved. |
| /business/payments | Private preferred method: MonCash, NatCash or future card provider. No account verification, link or charge. Suspended/demoted merchants cannot save. |
| /premium | Feature and access presentation. No unapproved price, automatic trial or fake purchase button. |
| /premium/manage | Owner-scoped wishlist palettes and active-access quantity aggregates for the most recent 30 active registries. Requested, confirmed, held, remaining and percentage progress are distinct. |
| /admin/premium | Fresh SUPERADMIN role required for expiring pilot grants and immediate revocation, with transactional append-only audit. Account-ID selection is a pilot operator tool; full account directory remains future work. |
| /discover | Submitted, rate-limited budget/currency/occasion search over approved merchants and confirmed available physical stock. |
| /appearance | Automatic/off seasonal presentation, independent from light/dark preference. |

Expiry/revocation restores mint public presentation without deleting the saved palette. Owners can always reset to mint. Palettes never change checkout colors, prices or inventory. No guest identities, visitor tracking, revenue claims, paid subscriptions or administrative roles are added to Premium.

## Ranking and seasonal rules

Version 1 is a catalog heuristic: exact category matches first, then prices nearer the maximum, then stable IDs. First pass allows three gifts per merchant before filling remaining slots. It ranks the bounded 96-candidate window, not the whole catalog. No global-best-value, popularity, personal-taste or paid-placement claims. Budget is per gift and excludes delivery. Missing currency prices are not converted. Merchant category is fallback when product category is absent. Checkout revalidates price and inventory.

Haiti timezone: America/Port-au-Prince. Valentine gifting window February 1-14, Christmas December 1-25. Independence/Ancestors January 1-2, Flag/University May 18 and Vertieres November 18 have neutral commemoration text, no sales CTA. Gifting windows are product choices. No guessed movable holidays. Explicit occasion selection overrides the seasonal discovery default. Visitor opt-out restores everyday presentation. No timer, cron, asset pack or remote calendar.

References: [BUH calendar](https://buh.ht/accueil/contactez-nous/jours-feries/) and [OFNAC publication](https://ofnac.gouv.ht/wp-content/uploads/2023/04/AIP-AMDT-0119-English-version.pdf). [MonCash Business](https://moncashdfs.com/business) distinguishes sandbox testing and separate live approval; this does not establish merchant-direct integration approval or international card acceptance.

## Payment handoff

The new contract requires safe positive integer minor units and exact order/recipient/currency/amount evidence. Creation deliberately fails closed until a real merchant-direct adapter is approved. The unused legacy provider registry is retired so future callers cannot accidentally enter platform-owned prototypes. The existing separate Stripe sandbox checkout and recovery remain unchanged.

Future adapters must resolve recipients from server-verified merchant accounts, use provider idempotency, verify signatures/authenticated inspection, persist unique provider events atomically with order/inventory transitions, and handle ambiguous timeouts, reconciliation and refunds. Browser-return success is never payment evidence. The pure matcher is not cryptographic verification. No fabricated endpoint, live provider, credential storage or Premium billing integration is claimed.

## Measured limits and remaining gates

Local benchmark: 2,000 fictional products, 30 warm samples after five warmups; p50 2.71ms, p95 3.73ms for query plus ranking on local PostgreSQL. Not a hosted/network/concurrency SLA. Reproduce with RUN_DISCOVERY_BENCHMARK=1 npx tsx scripts/benchmark-discovery.ts on a disposable loopback _test database. Cleanup is scoped to its fictional owner. Category ordering may examine/sort more rows than the returned candidate bound; inspect query plans at realistic future catalog sizes. USD/HTG availability indexes are included. Private access data is not shared cached.

Owner application database and Google-linked superadmin remain untouched. Migration rollout depends on the session-security branch. Provider onboarding, real payments/refunds, paid subscription billing, full account administration, admin MFA and hosted operational/performance acceptance remain release gates. Seasonal styling and palettes are implemented for review, not claimed owner design sign-off.
