> Approved by the owner for implementation. Active status and evidence: docs/HANDOFF.md. Free services first, 50 USD total year one. Visual direction selected: A / Lakou with B / Atelye product detail. Commercial payment/fulfillment decisions remain pending. Original planning text follows.

# KadoLakay: scope, design, and launch plan

Original research draft, October 26, 2026; subsequently approved for implementation. Current evidence is in HANDOFF.md and FEATURE-STATUS.md. The historical baseline and design explorations below do not override later owner decisions. By October29, shared physical stock, retry/resume and dependency remediation are implemented locally; hosted/payment/operational gates remain open. The owner-approved current palette is mint HSL170.6 76.9%64.3% on pale mint HSL166.2 76.5%96.7%, with Fraunces/Figtree fonts.

## 1. Product definition

KadoLakay is a trilingual gift registry connected to approved Haitian businesses, serving families in Haiti and relatives in the diaspora. It must let a family make and share a useful list, let a giver find and fund an eligible gift, and let the responsible merchant or operator fulfill it with clear accountability. A distinctive Haitian visual identity and purposeful 3D should strengthen that experience.

The primary audiences are registry owners, gift buyers, merchant owners, and administrators. The primary public actions are Create a registry and Find a registry. Merchant and product discovery must also be usable without an animation. Haitian Creole, French, and English have equal standing. Language and transaction currency are independent choices.

Confirmed constraints: ocean blue, sand, and coral; no AI-generated images, emoji, or em dashes; no unrelated stock imagery presented as Haitian content; original logo work; real product interactions rather than decorative demos. PMNDRS caustics and React Bits circular carousel are quality and motion references, not product specifications or instructions to paste their components into the homepage.

Confirmed infrastructure budget: **$50 total for the first year**. This is a constrained pilot budget. It cannot purchase a year of managed paid hosting, a commissioned asset library, and production service guarantees. Transaction fees, refunds, delivery, legal setup, and merchant costs need a separate business treatment; they cannot silently be assumed free.

## 2. Current reality

The application runs locally on Next.js with PostgreSQL and Prisma. It is not publicly deployed. The local database is development infrastructure, not the planned production database.

| Area | Present | Missing or not externally verified |
| --- | --- | --- |
| Registry | Draft creation, manual/external gifts, publish nonempty lists, public page, archive | Connected catalog picker; complete private access journey; searchable opt-in public registries |
| Merchants | Registration, pending review, admin approval/suspension, product creation, paid-order list | Public storefront and product pages, profile editing, product editing, photo management, stock controls |
| Checkout | USD Stripe checkout implementation, signed webhook validation, registry reservations, idempotency | Provider credentials and eligible business account, end-to-end hosted payment verification, physical stock accounting |
| Operations | Payment status and reconciliation source | Fulfillment workflow, refunds, settlements, commissions, recipient delivery information, support and exception handling |
| Security | Session ownership checks, strict validation, nonce script CSP, safe URLs, database constraints, Redis limiter integration | Hosted verification, provider configuration, recovery exercise, dependency advisory resolution |

Historical baseline corrections: payment integration tests mock Stripe session creation; passing them is not evidence of money reaching a merchant. Shared physical stock and retry/resume were added October29, superseding the original in-stock-flag limitation in this table. Paid is not delivered. A commission field is not implemented commission accounting. Some raw queries still remain in actions despite the requested service-layer direction.

## 3. Commercial rules to settle before checkout design

Two answers are still needed: the legal registration country of the entity receiving payments, and whether KadoLakay, merchants, or both fulfill gifts. These determine provider eligibility and the order model.

Decide and record:

1. Who is the seller, who receives payment, who owes the customer a refund, and who handles support.
2. Whether MVP purchases happen on KadoLakay or externally. A signed native checkout payment and a user marking an external gift purchased have different guarantees.
3. Service area, pickup/delivery options, lead times, address privacy, delivery charges, and proof of completion.
4. Exact charged currencies, fees, price changes, cancellation window, refund rules, disputes, and merchant settlement timing.
5. Inventory ownership and reservation expiry, including scarce physical items shared by different registries.
6. Registry privacy: public and searchable only with explicit publication/search consent; unlisted/private lists must not leak through discovery.
7. Merchant review criteria and an audit record. Approval must not imply certified product quality without a process supporting that claim.

Proposed MVP boundary: curated approved merchants, whole-item gifts, one eligible payment provider, one documented fulfillment model, controlled pickup/delivery coverage. Cash funds, partial/group contributions, automatic multi-vendor payouts, and undefined custom gifts stay outside paid checkout until their accounting and operational rules exist. This boundary is a recommendation for confirmation, not an assumption already approved by the owner.

Stripe's official availability list does not list Haiti as a directly supported account country. A US or other supported entity must not be invented as a workaround. Select a provider after the actual business details are known. [Stripe availability](https://stripe.com/global)

## 4. Research and implications

Three separate agents researched product patterns, visual directions, and the actual source/business rules. None changed application code.

| Primary reference | Finding | Application |
| --- | --- | --- |
| [Babylist](https://www.babylist.com/), [registry finder](https://www.babylist.com/find) | Creator and giver have distinct entry paths | Put Find a registry alongside Create a registry |
| [Zola registry](https://www.zola.com/wedding-registry) | Shopping has product facts and separate registry/cart actions | Show seller, exact price, availability, terms, and a clear registry destination |
| [MyRegistry integration](https://developers.myregistry.com/docs/getting-started) | External merchant checkout has a different purchase-confirmation model | Do not blend external links and native payments behind identical promises |
| [Haiti Design Co](https://haitidesignco.org/), [maker teams](https://haitidesignco.org/pages/our-teams) | Real makers, materials, products, and places establish identity | Use authorized merchant content rather than tropical decoration |
| [Neighborly registry](https://neighborlyshop.com/pages/wedding-registry-at-neighborly) | Small merchant registries disclose handmade/special-order constraints | Design lead-time and made-to-order states |
| [GOODEE baskets](https://www.goodeeworld.com/collections/baskets) | Maker attribution and practical product detail support premium presentation | Use a factual catalog. Do not represent its non-Haitian products as Haitian |

These are observed public/documented patterns, not evidence that we tested competitors' private dashboards or completed purchases.

## 5. Three design options

All options must be compared using the same screens: desktop and mobile homepage, merchant storefront, product detail, public registry, and checkout. Include pending, empty, loading, sold-out, reservation, error, and successful states. A hero alone is not an acceptable design review.

### A. Lakou: family registry with visible local commerce

Homepage: strong registry title and two entry actions, one dimensional woven-basket composition, then actual merchants and gifts immediately below. Broad ocean typography, sunlit surfaces, modest coral emphasis. Open layouts, rounded actions, and generous but useful spacing. Merchant pages show real identity and practical information. Registry pages prioritize remaining quantities, prices, and gift status.

One optional 3D interaction: selecting a category brings a corresponding object forward in the basket. Normal HTML links remain available. The scene does not impersonate a live cart.

Cultural research should study a participating maker's actual basket construction, proportions, and materials, with permission. A concrete starting reference is this [Haitian-made basket listing](https://rosiesboutiquehaiti.com/products/small-oval-sorting-basket). Do not invent cultural symbolism for a generic wicker shape.

Provisional type exploration: substantial Bricolage Grotesque headings and a quieter UI face. Test with real HT/FR/EN copy before choosing. Explore a restrained original woven-intersection logo, not another stock gift icon.

Tradeoff: moderate asset work, best balance for the registry and marketplace. **Recommended foundation.**

### B. Atelye: maker and product first

Homepage: direct catalog/search navigation and one substantial real product composition. Material detail and maker attribution carry the identity. Storefronts and product pages are the centerpiece; registry creation stays prominent. Product photographs, dimensions, stock, price, and fulfillment information remain visible together.

One optional 3D interaction: inspect one real product with a restrained turn and believable material lighting. Photographs remain the default. Not every merchant needs a model.

Research references: [Haiti Design Co recycled steel art](https://haitidesignco.org/pages/recycled-steel-art), [Lam Museum cut-iron research](https://lammuseum.wfu.edu/2026/09/haitian-cut-iron-art/), and [Deux Mains](https://deuxmains.com/pages/our-story-2). Study craft processes, not artwork to trace into a logo. Provisional type direction: condensed, practical display typography paired with highly readable UI text.

Tradeoff: depends most on strong authorized product photography and ongoing merchant content. Best for a curated design-led store.

### C. Lakay: home and occasion first

Homepage: architectural rhythm and a small domestic display, with clear registry actions beside it. Products are grouped by useful gifting contexts and occasions. Merchant identity and catalog filters remain accessible. Registry grouping is optional and cannot hide availability or status.

One optional 3D interaction: a compact display recomposes gently when the occasion changes. No camera fly-through, flags, globe, or confetti sequence.

Research starting point: [FOKAL heritage work](https://fokal.org/index.php/en/2016/01/20/heritage-2/). Study light, framing, and documented architecture with context; do not claim a decorative motif represents all Haitian homes. Provisional type direction: humanist headings and disciplined transactional text.

Tradeoff: greatest scene-composition effort and greatest risk of becoming decorative rather than useful.

Recommendation: A's registry-first structure, B's factual merchant/product presentation. Present all three visual boards before choosing final typography, logo, layout density, button shape, and motion. The user may combine specific elements and request revisions. These descriptions are proposed directions, not approved designs.

## 6. Motion and asset contract

One deliberate discovery scene, not continuous effects across the app. No heavy 3D on login, registry editing, merchant admin, or checkout. Source assets must be original or licensed/authorized; merchant photos cannot be replaced by invented listings.

Compare lightweight rendering approaches before selecting the final stack. Full Three.js/React Three Fiber plus caustics must not be promised within the original 150kB gzipped overhead without measurement. Treat that as a proposed hard budget unless the user explicitly approves a measured exception. Separate JS size from model/texture downloads. Use compressed geometry/textures where useful; no paid Spline dependency assumed.

Define pointer, tap, drag, keyboard, reduced-motion, poor-frame-rate, WebGL-failure, and slow-network behavior in the storyboard. Stop rendering when hidden/offscreen. Standard HTML content and actions must work with the scene absent. Target smooth motion on representative midrange hardware; report actual measured results rather than asserting 60 FPS from a desktop preview.

Seasonal content must be editable data: allowed presets, localized message, active dates, preview, default fallback, and audit history. A season cannot change a product price, inventory, or payment rule.

## 7. Hosting recommendation for $50/year

**Conditional pilot recommendation: Netlify Free + Neon Free PostgreSQL + Upstash Free + Cloudflare R2 Standard free allowance + a standard domain.** This is a proposed allocation, not a deployed or guaranteed service configuration.

| Component | Proposed service | First-year allocation | Constraint |
| --- | --- | --- | --- |
| App and API | Netlify Free, Next.js adapter | $0 within quotas | 300 monthly credits; exhaustion pauses projects |
| Permanent relational data | Separate Neon Free PostgreSQL project | $0 within quotas | 1GB, 100 CU-hours/project/month; short restore window |
| Shared rate limiting | Upstash Free Redis | $0 within quotas | 250MB and 500,000 commands/month; limiter operations are not identical to user requests |
| Merchant photos / models | Cloudflare R2 Standard | $0 within quotas | 10GB-month, 1M writes and 10M reads included monthly; protect uploads and monitor usage |
| Transactional mail | Resend Free, verified sender domain | $0 within quotas | Daily/plan quota; do not treat an unsent receipt as a failed payment |
| Domain | Standard available .com through Cloudflare Registrar | Reserve $15 | Published standard price $10.46 before applicable extras/tax; exact domain availability/premium price unverified |
| Contingency | Unspent reserve | $35 | Taxes, unexpected needs, limited temporary upgrade; not a promise of a year of paid service |

Sources: [Netlify pricing](https://www.netlify.com/pricing/), [commercial use](https://www.netlify.com/blog/introducing-netlify-free-plan/), [Next.js adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Neon pricing](https://neon.com/pricing), [Upstash pricing](https://upstash.com/pricing/redis), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Resend pricing](https://resend.com/pricing), [domain prices](https://pricing.registrar.cloudflare.com/). Prices and allowances checked October 26, 2026 and can change.

Vercel Pro starts at $20/month, before database and other usage. Its Hobby plan excludes commercial use. It therefore does not fit this annual cap. [Vercel Pro](https://vercel.com/docs/plans/pro-plan), [Hobby restrictions](https://vercel.com/docs/plans/hobby)

Cloudflare Workers/OpenNext is an alternative to investigate, not a zero-effort replacement: native database engine compatibility, middleware, caching, SDKs, and worker size must pass. Free Workers has a 3MiB compressed bundle cap. Avoid a broad infrastructure rewrite just to claim free hosting. [OpenNext compatibility](https://opennext.js.org/cloudflare)

Operational conditions:

- Keep production database separate from staging and developer credentials. Use TLS, bounded connection pools, least-privilege application access, reviewed migrations, and correct regional placement.
- Store photos/assets outside relational rows. Separate public product media from private backup or identity material. Use owned-object upload authorization, size/type limits, and safe CORS.
- Cache only eligible public catalog data. Never cache sessions, private registries, payment evidence, inventory decisions, or customer addresses into shared public responses.
- Verify Next.js proxy, nonce headers, cookies, redirects, and cache invalidation on the actual host. Port the existing Vercel cron to an appropriate scheduler; do not assume vercel.json runs on Netlify. [Netlify schedules](https://docs.netlify.com/build/functions/scheduled-functions/)
- Measure scheduled database usage. Polling every five minutes can prevent a database with a five-minute idle timeout from sleeping. Design bounded pending-order reconciliation and measure compute before committing to free quotas.
- Prove a secure off-database backup and restore path. Neon Free's short history is not a substitute for an operational backup policy. Recovery objective, retention, encryption, and alerting must be explicit before accepting real orders.
- Budget Netlify credits before release. At published rates, four production deploys use 60 credits, 5GB bandwidth uses 100, 100,000 requests use 20, and 2GB-hours compute use 20: an illustrative total of 200/300. This is an estimate, not a workload benchmark or a promise that all usage fits.
- Define an operator alert threshold below each quota, a checkout disable switch, provider retry/reconciliation handling, and an upgrade/migration decision. Free-tier downtime can affect webhook delivery and order recovery. No paid SLA is included.
- Payment processing and fulfillment costs are separate from this infrastructure estimate. If $50 must cover those too, estimate them from the chosen provider, volume, and business country before approving launch.

This plan can fund a small controlled pilot. It cannot honestly guarantee unrestricted, continuously available commercial operations for $50/year. Product quality, security rules, and honest copy remain mandatory even for the pilot.

## 8. Delivery steps and gates

| Step | Deliverable | Pass condition before continuing |
| --- | --- | --- |
| 0. Scope agreement | Seller/payment/fulfillment/privacy/stock rules and pilot boundaries | Owner confirms the commercial model and infrastructure constraints |
| 1. Design selection | Three comparable visual boards covering desktop/mobile and core screens, plus 3D storyboard | User chooses a direction and approves requested tweaks; no app redesign before this |
| 2. Hosting proof | Nonproduction hosted app, separate database, OAuth, limiter, scheduler, storage, recovery trial | Full hosted smoke journey passes; measured quotas fit; rollback and restore verified |
| 3. Complete merchant loop | Register, review, approve, storefront, product management, stock, add to registry | Pending/suspended listings remain inaccessible as required; cross-account access denied |
| 4. Registry and native checkout | Create/find/share, gift selection, reservation, one real provider path | Concurrency, exact money, payment failure/retry, and signed idempotency tests pass |
| 5. Operations | Fulfillment, support, cancellation/refund, settlement policy, audit records | Operator can complete and investigate an order without editing database rows manually |
| 6. Art direction implementation | Approved identity, screen system, seasonal content and one adaptive scene | Mobile, keyboard, reduced-motion, translation and performance criteria pass |
| 7. Release review | Staging evidence, resolved blocker list, controlled provider smoke test, operating runbook | No unresolved release-critical defects; owner reviews concrete release before publication |

Necessary build work can proceed in parallel only after the business and design gates it depends on. A failed gate creates an issue with evidence, owner, and a retest condition. It is not waived by a passing screenshot or unrelated unit test. Do not use calendar promises until the missing content/provider decisions are known.

## 9. Required verification matrix

- **Authorization:** unauthenticated, wrong owner, stale admin/merchant role, suspended merchant, altered IDs, missing session. Fresh server checks on every mutation.
- **Inventory:** simultaneous purchase of the last physical SKU across two registries; reservation expiry; negative/excess quantity; stock edits with active reservations; merchant suspension between display and payment.
- **Money:** exact transaction currency and minor units, zero/negative prices, decimal precision, price changes after selection, fees/refunds, mismatched provider totals. Display conversion cannot become the charged transaction by accident.
- **Payments:** forged signatures, duplicate and out-of-order webhooks, paid-after-timeout, unpaid return URLs, provider outages, abandoned checkout, retries, partial failures, reconciliation and refund exceptions. Only verified provider evidence marks paid.
- **Privacy/security:** strict schemas and unknown keys, IDOR, malicious URLs and stored text, nonce CSP/XSS, CSRF/origin protection, rate-limit bypass/IP trust, secret/log exposure, object upload abuse, dependency review. A sanitizer label is not a substitute for these checks.
- **Database:** constraints and unique idempotency keys, migration rehearsal, query plans/indexes, bounded pagination, transactional rollback, restore drill, audit/history retention.
- **Product:** full creator, giver, merchant, and admin paths; no dead controls; helpful localized errors; empty/loading/error/success states; receipt and support recovery.
- **Experience:** HT/FR/EN real text, semantic controls, keyboard and screen-reader checks, contrast and focus, small screens, no horizontal overflow, natural touch scroll, animation disabled, WebGL unavailable, slow network and midrange device measurements.
- **Release:** hosted Google and second agreed sign-in path, actual test-mode checkout through webhook to order, controlled live verification when account eligible, verified emails, monitoring/alerts, recovery and emergency checkout disable procedure.

Suggested performance targets for agreement: mobile LCP <=2.5s, INP <=200ms, CLS <=0.1 under defined representative conditions; separate measured slow-network behavior and 3D budgets. These are targets, not current results.

## 10. Next review

Confirm the commercial model and pilot hosting constraints. Then review the three visual directions with identical product content and requested tweaks before implementation. The recent carousel remains a demonstration, not the product design or a release milestone.
