# KadoLakay feature status

## October 29: draft creation fixed

Blank optional Amazon/store link no longer crashes URL validation. Invalid links receive specific field feedback; draft errors distinguish authentication, rate limiting and service failure. Inputs are preserved and error feedback automatically revealed. Browser verified successful private draft creation/editor navigation with empty URL and future date; temporary verification record archived. All 14 local DB integration tests pass, plus unit/action regressions, TypeScript, lint and production build. No migration or payment change. Source synchronization is being verified separately; current release blockers and basket work remain open.

## October 28: registration validation UX fixed

All missing/invalid fields appear together in an automatically focused, visible summary with direct field links, matching inline errors and explicit required labels in HT/FR/EN. Inputs persist on failure. Corrected errors clear on blur. Server failures are revealed through the same summary. Desktop and 320px browser checks verified no manual scrolling to discover errors, correct field focus and retained values. Strict server validation remains in force; no database change. This coverage is business registration, not every application form.

## October 28: business patente input implemented

Optional patente number in HT/FR/EN registration, strict server validation and VARCHAR(100) database persistence. Leading zeroes retained; blank normalized to null. Private owner-dashboard/admin-review display; public DTO exclusion tested. Invalid input preserves the form and focuses the field. Registration primary button measured mint, including hover; the unspecified orange control needs its exact label/page to reproduce. Verified 208 unit tests, 13 local PostgreSQL tests, TypeScript, targeted lint and production build. No government verification or automatic merchant approval implied.

## October 28: occasion onboarding implemented

Two-step welcome flow: optional prefilled name/language, then six occasion choices plus Explore/Skip. Shared picker also starts registry creation, preserves details on occasion change, and supports Christmas, Shopping and Other as actual database types. Authenticated/rate-limited service-layer persistence, strict schemas, skip/completed distinction and replay-safe progress. Default login onboarding with explicit callback preservation; Get started allows review. Existing app colors/fonts/stars/theme preserved. Basket in both modes and the broader contextual checklist remain unfinished.

Local additive migration applied with no data reset. Verified 200 unit tests, 12 PostgreSQL tests, TypeScript, production build; full lint zero errors/13 existing warnings. Browser profile save, selection, Explore/Skip, HT/FR/EN and mobile overflow checks passed. Hosting and live payment gates remain open.

## October 28: wishlist reference implemented

- Fraunces headings/Figtree body, self-hosted through Next/font.
- Public wishlist progress, real availability/hold/confirmed filters, image fallback and existing share/QR control.
- Owner overview with compact progress and authorized manage/public-view links. Password omitted from owner DTO.
- Direct persisted light/dark icon switch. Approved mint colors and Gravity Stars preserved.
- No demo reservation/purchase handlers. Native payment activation remains unfinished.
- Verified: 187 unit tests, 8 PostgreSQL tests, TypeScript, production build, browser desktop/320px and theme persistence. Targeted lint: zero errors, one native-image optimization warning.

Updated October 27, 2026. This is implementation evidence, not release approval. See HANDOFF.md for checks and remaining launch blockers.

| Feature | Actual state |
| --- | --- |
| Shared-link registry finder | Implemented: exact-address lookup, public preview, localized errors and rate limiting |
| QR share card | Implemented: title/occasion/date/link embedded in PNG, public-list checks, actual downloaded-file decode verified |
| Guest image QR scan | Implemented and browser roundtrip verified; no image upload |
| Guest live-camera scan | Implemented with cleanup and fallbacks; physical-camera and printed-code verification still required |
| Business directory | Implemented: name/city search, categories, bounded 12-item keyset pages and failure recovery |
| Merchant onboarding/catalog | Core registration, review, product edit and ownership checks implemented; real hosted identity and operator journey remain unverified |
| Visitor Light/Dark/System | Implemented in this pass: SSR cookie preference, native animated wipe/fallback, mobile menu, semantic colors |
| Claude prototype redesign | Reviewed reference only; four-step flow and progress basket not ported into live app |
| Gravity Stars background | Implemented: upstream canvas interaction, pause/resume, reduced motion, visibility cleanup and mobile/pixel budgets |
| Product-item Tilt | Reference recorded; not implemented |
| Admin merchant approvals | Implemented basic review screen; no complete superadmin operations dashboard |
| Admin metrics and brand/seasonal editor | Not implemented; visitor appearance switch is a separate feature |
| Google/other external sign-in | Provider code present; credentials and hosted callback verification missing |
| Native payment | Stripe implementation/tests exist; new checkout disabled pending eligible entity/provider and operational rules; no live payment claim |
| Shared physical SKU stock, fulfillment/refunds/settlements | Remaining release work |
| Free hosting, production DB, domain | Configuration/plan only; no successful public deployment or purchase claimed |
| Security and operations release gates | Dependency advisories, provider/hosted verification, backup/restore and monitoring remain open |

Budget remains 50 USD total year one. No paid service installed or provisioned in this pass.

October28 update: bulk catalog gift picker implemented (select/review/add up to20 atomically);170 unit and8 PostgreSQL integration tests pass. Owner browser flow awaits configured authentication. Login card refined without claiming working external credentials. Appearance now icon button with choice popup. Homepage decorative basket replaced by shared-link finder/QR entry. Colors remain provisional. Claude reference is UX/business inspiration only. Screenshot: outputs/KadoLakay-home-access.jpg.

October28 login correction: actual public Spectrum login-card source adapted with retained Apache license, email/arrow and provider-pill layout, staged CSS motion and reduced motion. Register styles/missing translation fixed. No-provider state shows disabled controls with an unavailable explanation. Google activation guide and interactive npm run auth:setup prepared; owner is creating OAuth client. Live sign-in still awaits local credentials/restart and callback test.174unit tests across full+targeted runs,8database tests and productionbuild pass.

Googlelocalactivation October28: realGoogleOAuthlogin,sessionreload,signout,protectedpage redirectandrepeatlogin nowbrowserverified againstPostgreSQL. AppisExternal/Test with1testuser andlocalhostcallback. HostedpublicGooglelogin,Microsoft/GitHubandemail stillunconfigured/unverified. Credentialsstoredlocallyignored,notindeliverables. Setuprejectsmaskedandrepeatedsecretpastes.

Confirmed local Google login: browser account selection, consent, callback, persisted session, sign-out, protected-dashboard redirect and repeat login all passed. The Google application remains in testing mode with one test user. Hosted production login and additional providers remain separate open gates.
