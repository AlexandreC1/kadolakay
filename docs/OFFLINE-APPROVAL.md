# Bayou code implementation review

Final verification refreshed November 2, 2026; implementation began October 31.

Review branch: codex/offline-completion, stacked on codex/product-foundations (PR13). Hosting and live payments remain paused. Nothing has been merged into main or applied to the owner's original database.

## What can be reviewed

Local preview: http://localhost:3110/en. It uses bayou_release_test on loopback55433, fictional accounts and catalog records. It does not use the owner's Google account, private data or provider credentials. A temporary fictional buyer browser session is used for the signed-in review. The original app/database on 55432 remains separate.

| Flow | Page | Implemented behavior |
| --- | --- | --- |
| Home | /en | Focused introduction, Create and Find, logo/Home return; dedicated feature routes. |
| Baskets | /en/baskets | Personal purchase or shared gifting, recipient/message, private drafts, multi-gift picker, reload/edit, explicit publication. External links are manual and never scraped. |
| Privacy | Basket details and registry editor | Public, link-only, private or password access; explicit search opt-in; password hashes, bounded grants and literal text rendering. Personal baskets cannot enter public search. |
| Lookup | /en/find and /en/registries | Existing QR scanner and exact-link finder, plus consent-based name/event search and occasion filters. Private/protected/archived/suspended data excluded. |
| Buyer operations | /en/purchases | Own history, merchant portions, encrypted delivery contact, refund/cancellation requests and clear financial status. |
| Guest operations | /en/track | Private checkout code via POST, short-lived HttpOnly access; own tracking, encrypted contact and refund request. Order number/email alone grant no access. |
| Merchant workspace | /en/business | Separate registration/profile/catalog/photos/order/payment-setup pages. Profile identity edits return approved merchants to review. Patente field retained. |
| Merchant orders | /en/business/orders | Fresh ownership checks, verified-payment prerequisite, ordered fulfillment transitions, method locking and mixed-merchant completion. Unresolved requests block advancement. |
| Administration | /en/admin | Overview, per-currency verified payment volume, accounts, review, order support, audit and campaigns. Merchant volume is not labelled Bayou revenue. |
| Roles | /en/admin/accounts | Owner-only suspension and staff delegation, immediate session invalidation, no web creation/demotion of SUPERADMIN and no self-change. |
| Security | /en/security | Per-browser revocation; admin authenticator enrollment from a fresh sign-in, same-browser pending setup, replay prevention, one-use recovery codes and15 minute step-up. |
| Premium | /en/premium/manage | Existing pilot personalization and bounded server-side insights retained. No new subscription or paid entitlement is fabricated. |
| Recommendations | /en/discover | Per-gift or whole-selection budget, occasion, exact minor-unit totals, bounded96-candidate query and deterministic merchant variety. Not an optimality or stock-reservation promise. |
| Campaigns | /en/admin/seasons | Owner-managed translated titles, fixed presets, priority/window, Haiti-local inclusive dates and global disable. Visitor opt-out wins; commemorations have no gift CTA. |
| Recovery tooling | npm scripts | Local key generation, provider-token encryption migration and authenticated streaming backup/empty-test-database restore. |

## Actual verification

- 338 unit checks passed.55 integration checks passed against disposable PostgreSQL18. DB checks are explicitly skipped in the unit command, then run separately; they are not double-counted.
- 32 production-server HTTP checks passed with actual encrypted fixture cookies, including stale roles, device/version revocation, protected data, localizations, dedicated pages and fail-closed shared-rate-limit behavior.
- Production build and its TypeScript check passed. Lint:0 errors,14 warnings, primarily existing raw-image warnings. Dependency audit:0 high/critical;20 moderate transitive findings remain in the Sentry/ESLint glob/minimatch chains.
- Warm local recommendation benchmark:2,000 fictional products,30 measured queries after warm-up, p50 9.15ms / p95 11.85ms. This is not hosted latency, concurrent load or a mobile-network measurement.
- Encrypted backup restored to a new empty loopback_test database. Row counts matched (3 fictional users,1order,86 operation audit entries at that snapshot), and8 immutable-audit triggers survived. A malformed header was caught during the first rehearsal and the parser offset was corrected before the successful restore.
- Browser: private basket creation, two-item selection, link-only save/publication, buyer delivery save, merchant status form, verified admin overview/campaign page. Desktop/mobile screenshots and remaining browser evidence are recorded in OFFLINE-COMPLETION.md.

## Important fixes caught by verification

- Legacy password rows with inconsistent public visibility now fail closed.
- Native action reset could visually show Public after an Unlisted save. Forms now preserve selections after completion and clear sensitive password/code fields.
- Creation defaults inside partial Zod updates could reset omitted visibility/locale/quantity. Partial-update defaults were removed and regression-tested, including preservation of a protected registry when renaming it.
- Catalog/manual mutations share actor/registry locks, reject archived/foreign/history-bearing edits, cap new lists at500 items and retain authoritative catalog facts. The UI permits safe quantity edits before checkout history exists.
- Admin enrollment is bound to both a recent device session and that exact device, so another signed-in browser cannot read or confirm a pending setup.

## External activation and release gates

This is a code review, not public-launch approval. Live merchant-direct payments, real refunds, subscription billing, hosted OAuth callbacks/shared rate limiting, email/storage provisioning, alert delivery, production restore drills, physical-camera/mobile-network acceptance and main-line integration remain separate release gates. Existing Google setup on the original workspace was not copied or retested against this isolated preview.

Production writes fail closed without the shared limiter; there is no development-memory fallback in production. The moderate dependency findings need compatible upstream remediation before public launch. See the current audit and primary advisories: https://github.com/advisories/GHSA-g3hv-75wg-m249 and https://github.com/advisories/GHSA-3g3m-2fjr-6pw4 . Do not run npm audit fix --force: its proposals downgrade major application tooling. Do not globally replace minimatch3 with11: legacy callers use a different export API.

Financial decisions remain intentionally conservative: accepting a refund request neither transfers money nor restocks products. One resolution record per merchant/order is the current MVP policy; partial or repeated financial refunds and dispute accounting need a provider-integrated ledger. No notification or external-account side effect is invented.

Keep the original database untouched until approved migrations, a verified backup, encryption-key custody and deployment configuration are ready. Approval of these pages does not authorize a purchase, live payment activation, merge or production deployment.
