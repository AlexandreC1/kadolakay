# Local feature completion and approval gates

Owner requested October 31, 2026: implement all remaining code-only features, test consecutively, then show functioning flows for approval. Netlify, paid services, real payment/refund transfers, email delivery and production deployment remain paused. Preserve current mint identity, focused Home, dedicated pages, languages and privacy defaults.

## Stages

1. Basket modes (personal purchase/shared gifting), private drafts, owner editing, explicit sharing; searchable consent and password-protected/unlisted access.
2. Merchant profile/catalog workspace; per-merchant fulfillment and refund-request workflows. Verified payment and inventory state are never fabricated by an operational button.
3. Unified admin overview/accounts/audit; suspension and bounded role delegation; authenticator step-up, recovery and individual sessions; encrypted provider token storage.
4. Seasonal campaign editor and disable switch; whole-basket budget suggestions and price variety; local backup/restore rehearsal, query/index and failure/concurrency checks.

Each stage needs strict-input/ownership tests plus a real disposable PostgreSQL run before its UI is marked complete. Final gate: unit, DB, typecheck, lint, build, production HTTP/browser paths and review evidence. New admin/security state must be scoped to fictional test accounts during verification. No owner records or OAuth credentials copied into test data; no production auth bypass or fake paid checkout.

## Product rules

- Baskets begin private; recipient has no automatically created account or notification. Personal mode does not permit another person to purchase it; shared mode uses individual gift eligibility. Store links are manual, without scraping. Currency totals are separate.
- Search visibility is separate from publication/link access and requires owner opt-in. Protected content requires a bounded password grant; drafts/private lists stay inaccessible.
- Merchant operations are per seller, including mixed-merchant orders. Delivery/cancellation/refund-request status cannot change a verified payment into a refund, release ambiguous holds or restock goods automatically.
- Premium remains pilot access for selected personalization/insights. No pricing, billing or administrative privilege is added to it.
- Administrator writes require fresh role and short-lived authenticator step-up. No web operation can create or demote the platform owner. Audit commits with the decision. Suspensions revoke access rather than delete financial records.
- Seasonal edits use fixed presets and literal localized copy, never arbitrary scripts/CSS/remote links. Recommendations are explainable bounded catalog rules, not a paid AI dependency or promised optimal shopping solution.

## Evidence ledger

Updated at each completed stage with actual commands, counts, screenshots, limitations and remaining approval items.

### In-progress core gate, October 31

Branch codex/offline-completion based on17a77c2 (PR13). Two additive migrations applied only to bayou_release_test on 55433. Schema adds device sessions/MFA enrollment, basket/privacy fields, operation audit, media, merchant fulfillment/refund requests, campaign settings and encrypted order delivery storage. Original account/database/source untouched.

Passing focused checks so far:9 crypto/RFC unit checks;2 real-PG device/MFA lifecycle tests;3 basket/privacy PG tests;5 operation/governance/media PG tests. Legacy audit action constraint initially caught incompatible labels; services now preserve BUSINESS_STATUS_CHANGED and record detailed categories in the separate generic audit, retaining all DB protections. Admin-console role audit has an additive constrained source; owner role remains operator-only.

Still in progress:complete reader/UI wiring, guest tracking and delivery, vault/backup scripts, all-action regressions, full suites and updated production HTTP harness. Auth now requires a per-device record; existing fixture cookies need updating and legacy cookies will need fresh sign-in on rollout. DATA_ENCRYPTION_KEY must be provisioned before real OAuth token writes/MFA; no real credentials have been moved. Admin mutations and back-office reads require device-bound15 minute authenticator verification. Do not claim broad feature completion or public readiness from these focused checks.

### Completed local gates

338 unit and55 real-PG tests pass;32 production HTTP checks pass. Full production build/typecheck passes; lint0 errors/14 warnings. Audit has20 moderate transitive advisories,0 high/critical; retain as a public-release blocker rather than hide or apply incompatible major downgrades. See OFFLINE-APPROVAL.md for business flows and LOCAL-SECURITY-OPERATIONS.md for key custody/migration/restore. Third additive migration binds MFA enrollment to a recently authenticated device.

Browser verification caught and fixed the action form reset misleadingly displaying Public after a saved Unlisted choice. Regression work also removed creation defaults from partial Zod updates to protect privacy/locale/quantities. Guest tracking/contact/refund requests use a short-lived private capability and never public order IDs/email. Merchant/admin page reads are bounded; no generated images or new runtime dependency. Final screenshots, GitHub/CI status and any remaining browser findings follow.

### November 2 verification refresh and coordination

Claude Code processes are active; concurrent remote design and API-locale branches are documented in CLAUDE-COORDINATION.md. No changes were merged from them. Original other managed worktrees remain clean. The disposable PostgreSQL process had stopped between sessions; restarted only its loopback55433 cluster, then reran the full55DB checks successfully. Prisma generation and DB tests are now sequenced to avoid rewriting generated client files during test imports.

Final338unit tests pass. Fresh production HTTP/build/typecheck, audit, client bundle secret scan and GitHub checks follow below. Current audit still20moderate/0high/critical. No paid service, hosting setup, real payment, original account migration or production deployment.

Final November 2 local result:338unit tests,55PG tests and32productionHTTP checks all passed. Build/typecheck passed, lint0errors/14warnings, audit0high/critical and20moderate. Client bundle scan checked34static JS/source-map files and found none of the local authentication/encryption/review secrets. Preview restarted on127.0.0.1:3110 with fictional data. Screenshot artifacts:Bayou-admin-review.png, Bayou-merchant-review.png, Bayou-budget-review.png, Bayou-budget-mobile-review.png in the parent outputs directory. Mobile390px test had equal document client/scroll widths375px, with no horizontal overflow.

Browser verified buyer delivery save, merchant acceptance and subsequent removal of buyer edit controls. Whole-selection example returned43USD within a50USD budget. Review uses a temporary fictional ordinary-user browser cookie only, not the owner account or a new app auth bypass. Concurrent Claude Code overlap report is preserved separately; do not combine design/schema changes blindly.
