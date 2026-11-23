# KDOM release integration checklist

Updated 2026-11-17. This branch starts from `claude/mobile-app` at `759a56a`, the newer pilot line described in `HANDOFF.md`. It is separate from `codex/two-gift-features` and its Prisma 6 database. Do not mix their migrations or databases. A checked item means only the stated acceptance check passed.

**Release status: not ready for public launch or live payments.** A hosted pilot is documented, but current hosting and provider configuration have not been independently reverified in this pass.

## Completed in this pass

- [x] Inspect the remote branches and identify the newer mobile/pilot lineage. No existing branch was reset or deployed.
- [x] Serialize mobile email-code creation per address; 12 simultaneous requests permit at most five codes in the configured window.
- [x] Reject a sign-in code that expires while its verification waits for a row lock.
- [x] Serialize mobile session creation per user; 12 simultaneous sign-ins leave at most ten valid sessions.
- [x] Exercise parallel wrong guesses, preserving the five-attempt limit.
- [x] Run the affected mobile integration suite against a fresh disposable local PostgreSQL database: 13 tests passed.
- [x] 2026-11-17: After updating Next.js, 353 unit tests passed with 78 DB tests skipped; all 78 passed separately against disposable PostgreSQL. Production build and TypeScript passed; full lint had 0 errors and 9 warnings. One concurrent two-worker run had a worker crash and was rerun successfully with one worker.
- [x] 2026-11-17: Updated Next.js and eslint-config-next from 16.4.3 to 16.4.6. npm audit no longer reports GHSA-mfr8-8qww-v76h; 11 moderate findings remain. The patch is not deployed.
- [x] 2026-11-23: Rate-limit public QR card generation before database lookup and image rendering using the shared limiter; deny requests when the limiter is unavailable. Focused endpoint and scannable-card tests passed (18), targeted lint passed, and the web unit suite passed 355 tests with 78 database cases skipped. This is not evidence of a deployed rate limiter or a distributed load test.
- [x] 2026-11-23: Override the vulnerable `effect` dependency only under `@prisma/config` to 3.22.5, without changing Prisma itself. Prisma client generation, all 22 migrations on disposable PostgreSQL, 78 database integration tests and the production build passed. Web npm audit reports zero high findings after this change. This override exceeds Prisma's exact dependency pin and must be revisited when Prisma supplies its own compatible fix.

## Open release gates

- [x] 2026-11-17: Applied KDOM naming to web and mobile source, translated copy, email display names, QR card branding and icon assets. Existing domains, OAuth identifiers, app package/scheme, authenticator issuer and historical checkout retry descriptions remain unchanged. Web home/login branding checked with an isolated database; email sender tests preserve addresses; QR tests verify scanning.
- [ ] Verify KDOM branding in a newly built Android APK and on a physical device, and review approved UI refinements against the prior KDOM branch. Google consent branding and production deployment remain separate external tasks.
- [ ] Reconcile the older feature branch and current pilot branch through a reviewed integration plan. Preserve schema lineage; rehearse migrations against a disposable database. The earlier KDOM checklist applies to the other branch and must not be presented as proof for this one.
- [ ] Verify the hosted pilot, current deployment branch, account settings, database, backup restore, rate limiter, storage, monitoring and actual costs using read-only checks before making operational changes.
- [ ] Obtain an eligible merchant-direct payment provider and prove onboarding, routing, settlement, refund and dispute workflows. Keep live payments disabled until every payment gate passes.
- [ ] Validate public Google sign-in, approved consent-screen branding, verified email delivery, domain and callback configuration. Test two-device sign-in and shared-list flows on a staging release.
- [x] Updated mobile Vitest from 3.x to 5.1.0; its two critical audit findings no longer appear. Mobile tests and type checking passed.
- [ ] Assess the mobile dependency audit. On 2026-11-23 it reported zero high and 10 moderate dependency paths; `--omit=dev` reported zero high and five moderate. This is a fresh audit result, not proof that previous findings were individually remediated. Assess the remaining glob and minimatch advisories and reachability without forcing an Expo downgrade.
- [ ] Assess and resolve the remaining web dependency findings. After the `effect` override, 2026-11-23 npm audit reported zero high and 11 moderate paths; `--omit=dev` reported zero high and five moderate. Audit counts are paths, not demonstrated runtime exploitation. Recheck compatible fixes and reachability before release.
- [x] 2026-11-17: After the KDOM source changes, the web suite passed 353 tests with 78 DB cases skipped in that command, web production build passed, lint had no errors and nine warnings; mobile suite passed nine tests, type checking, lint and Expo web export passed. The earlier 78 PostgreSQL tests passed separately before this branding-only pass.
- [ ] Complete a release-candidate run of the full tests, database tests, production build, lint, dependency audit, security/accessibility checks and constrained-network mobile performance measurements on the final commit.
- [ ] Review legal and merchant terms for the actual Haitian business and markets. Confirm budget and operating responsibilities.

See `PUBLIC-RELEASE-GATES.md` and `HANDOFF.md` for detailed requirements. Do not claim a mocked integration test is proof of a live provider transaction or a successful build is proof of a functioning production system.
