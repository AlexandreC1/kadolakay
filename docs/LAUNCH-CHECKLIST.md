# KDOM launch checklist

Last reviewed: 2026-11-05. Maintained in `codex/two-gift-features`.

**Release decision: NOT READY for public launch or real payments.** A checked item means the specifically stated task has supporting evidence. It does not certify the entire area. Leave an item unchecked until its acceptance test has passed, then record the date and evidence. Never put credentials, private share links or customer data in this document.

## Evidence recorded

- [x] 2026-11-05: 44 automated test files, 238 tests passed locally; TypeScript and targeted lint passed for the preceding payment/security changes. These include mocks and are not a complete production or integration test.
- [x] 2026-11-05: Disposable PostgreSQL payment verification passed for duplicate deliveries, competing payment fulfillment, amount mismatch and refund-required state. See [payment concurrency test](PAYMENT-CONCURRENCY-TEST.md). This does not test provider callbacks, checkout reservation races, real refunds or payouts.
- [x] 2026-11-05: Vercel reported success for preview commit `c06a237`. A successful preview build is not proof of production configuration, availability, or working payments.
- [x] Changes through `c06a237` are pushed to `codex/two-gift-features`. They are not confirmed merged to the main branch or deployed to production.
- [ ] Run the complete test suite, production build, lint and end-to-end tests against the final release commit and record results here.

## Payments and merchant business rules

- [x] Payment provider flags default to off and live checkout is guarded until merchant settlement exists. Sandbox checkout requires explicit enabling and test configuration.
- [x] Remove the unapproved 5% platform fee for new orders; the configured calculation is zero.
- [x] Checkout contains database transaction and reservation logic, and fulfillment checks verified payment details. Unit tests cover relevant rules; see PostgreSQL results above for what was actually exercised.
- [ ] Choose a provider that can onboard the Haitian business and the individual merchants and accept intended customer countries. Confirm legal and operational eligibility with the provider.
- [ ] Implement and verify merchant onboarding, merchant-specific settlement, order ownership and split handling for carts spanning merchants. Do not enable real payments until the funds go to the right recipient.
- [ ] Perform a full sandbox purchase from registry to provider callback, order, merchant notification, delivery and receipt.
- [ ] Test concurrent checkout reservations against PostgreSQL, including failure, expiration, duplicate submissions and late payment.
- [ ] Implement and test refunds, disputes, late-payment alerts and reconciliation with the payment provider. Verify failure and retry paths.
- [ ] Set an appropriate payment reconciliation schedule and alert on failed jobs and orders needing refunds.
- [ ] Confirm how customers see prices, currencies, delivery fees, refund responsibility and applicable fees before paying.

## Security and privacy

- [x] New registries receive cryptographically random share tokens; owners can rotate private share links. Existing links were not rotated.
- [x] Production startup validates required configuration. Missing required settings prevent startup; production site URL must use HTTPS. Payment credentials are required for enabled providers.
- [x] Rate-limiting, validation, authentication, role checks, security headers and Stripe signature verification exist in code. Their presence is not a complete security audit.
- [ ] Review every server action and API endpoint for authentication, authorization, strict input validation, rate limiting and safe error messages. Test user, merchant and admin access boundaries.
- [ ] Review and rotate legacy private share tokens without breaking existing links unexpectedly; give owners a migration process.
- [ ] Tighten CSP and test XSS, CSRF, file upload, SSRF, secret handling, session and account recovery paths.
- [ ] Investigate and resolve applicable dependency findings. The last npm install reported 17 findings, including two critical; applicability has not been established.
- [ ] Verify production Upstash and trusted proxy configuration; test outage behavior without disabling security checks.
- [ ] Confirm superadmin provisioning and recovery, audit logs, least-privilege access, backups, retention and incident response.
- [ ] Have privacy policy, terms and merchant agreements reviewed for the actual operations and jurisdictions.

## Database, cache and operations

- [x] PostgreSQL/Prisma schema includes indexes, payment uniqueness constraints and transaction logic.
- [x] Business catalog tag invalidation was added for product changes, moderation and business-owner account deletion.
- [ ] Verify cache freshness end-to-end for product updates and merchant suspension, including the separately CDN-cached product API. Never cache private registries, sessions or payment state publicly.
- [ ] Confirm production PostgreSQL, connection pooling, migration status, capacity limits, encrypted backups and a successful restore drill.
- [ ] Measure actual query plans with realistic data and address slow catalog searches and growing tables.
- [ ] Replace or supplement daily job scheduling with reliable, appropriately frequent reconciliation and retry handling inside the budget. Test alerts and recovery.
- [ ] Configure and test error monitoring, uptime checks, structured logs, redaction, actionable alerts and a rollback procedure.

## User-facing flows and accessibility

- [x] Registry edit page offers a downloadable QR image with KDOM, registry title and scan instructions. Local download was tested; a draft must be published and the deployed public URL configured before sharing.
- [x] Changing language retains the URL query and anchor; the search-query case was verified in a browser.
- [ ] Verify a private QR/link across languages and on a second device using the final domain; test token rotation and revocation.
- [ ] Add privacy-respecting opt-in discovery by person and event, if approved, with pagination and abuse controls. Current finder accepts an exact address or link only.
- [ ] Verify Google login and recovery on the final domain, including disabled or unavailable providers and useful errors.
- [ ] End-to-end test registration, registry creation and publishing, multi-select, merchant onboarding and product management, orders, account settings and admin tools.
- [ ] Verify premium personalization and insights against entitlements. No paid subscription may be represented as active until billing works.
- [ ] Verify accessibility, translations, keyboard navigation, validation errors, responsiveness and empty/error states for the full flows.
- [ ] Measure latency, download size, animation resource use and responsiveness on a mid-range Android device using a constrained connection. Record actual results and budgets.
- [ ] Revisit the language selector appearance and verify it works with keyboard and screen readers.

## Hosting and release

- [ ] Confirm the final hosting/database configuration and recurring costs remain within the stated first-year budget. Do not assume all free plans allow production commercial use.
- [ ] Choose and verify a domain, complete name/trademark checks in relevant jurisdictions, configure HTTPS, email, OAuth callback URLs and real share links.
- [ ] Complete a release-candidate staging deployment, verify configuration and integrations, and obtain a launch decision after every blocking item passes.
