# Bayou workstreams and tasks

Status keys: `[ ]` open, `[~]` in progress (add branch name), `[x]` merged (add PR link). Each task names its workstream, dependencies and acceptance checks.

## Wave 0: lead agent only, in order

- [ ] **T0.1 Rescue the local working copy** (ws0)
  The site the owner runs differs from GitHub (see `STATUS.md`). Find that folder (owner names it), run `git status`, and commit everything except secrets to a new branch `rescue/local-2026-11-02`. Push it. Do not mix it into other branches yet.
  Accept: branch on GitHub; `git status` clean in that folder; secret scan of the diff finds nothing.

- [ ] **T0.2 Set the base** (ws0)
  Compare `rescue/local-2026-11-02` with `codex/quality-loop`, then apply the Claude patches in `work/claude-handoff/`. Owner decides which hero and header to keep. Create `integration/bayou` from the agreed result. Confirm GitHub CI is green on it.
  Accept: `integration/bayou` exists, CI green, `docs/DECISIONS.md` records the choice.

- [x] **T0.3 Ownership map** (Claude, branch `claude/compliance-quickwins`) (ws0)
  `.github/ownership.json`, `scripts/check-ownership.mjs`, CI job `Workstream Ownership`, and a test that every tracked file has an owner.
  Accept: a test PR from `ws6/` touching `prisma/schema.prisma` fails the check.

- [x] **T0.4 Env template** (Claude, branch `claude/compliance-quickwins`) (ws0)
  Add `DATA_ENCRYPTION_KEY`, `DATA_ENCRYPTION_PREVIOUS_KEYS`, `DIRECT_DATABASE_URL`, `SUPPORT_EMAIL` to `.env.example` with generation instructions. `npm run release:env` must fail when any required production value is missing.
  Accept: every `process.env.X` read in `src/` outside tests is either in `.env.example` or documented as host-provided.

- [ ] **T0.5 Retire the old line** (ws0, needs owner yes)
  Tag `archive/kadolakay-main` at `main`. Then, only with the owner's yes: make `integration/bayou` the default branch, and delete the retired branches listed in `STATUS.md`.

## Wave 1: parallel

### ws6 UI, copy, legal pages

- [x] **T6.1 Legal pages** (Claude, branch `claude/compliance-quickwins`; owner facts in `docs/LEGAL-TODO.md`) Privacy, Terms, Contact in ht/fr/en under `(legal)/`, linked from the footer and the sign-up page. Start from the retired line's `(legal)/content.ts`, rename to Bayou, and mark each page "Draft, pending owner and legal review". List every fact the owner must supply (legal entity, address, retention periods, who handles refunds, contact address).
  Accept: footer links resolve in all three locales; no invented facts; `TODO(owner)` list in PR.
- [ ] **T6.2 Screenshot fixes** (after T0.2 picks the hero): no overlapping notifications (show one at a time), every mockup row has an item name and price, both hero buttons visible at 1920×1080 and 1366×768 without scrolling, header fits at 1024 px without wrapping, "Kreyòl" spelled with the accent everywhere.
- [ ] **T6.3 One copy system** Move strings from the 13 `src/lib/*-copy.ts` files into the next-intl message files. Add a parity test that fails when a key is missing in any locale.
- [ ] **T6.4 Accessibility pass** Keyboard-only run of creator, giver, merchant and admin journeys; visible focus; 320 px with no horizontal scroll; reduced motion respected; text contrast at least 4.5:1 in light and dark.

### ws2 Auth, sessions, account rights

- [x] **T2.1 Account deletion and data export** (Claude, branch `claude/compliance-quickwins`) In Settings: download my data (JSON), delete my account (re-auth, removes personal data, keeps financial and audit rows anonymised). Port the approach from the retired line, adapted to Bayou's schema and audit rules.
  Accept: integration test proves personal fields are gone and orders and audit rows remain; export contains registries, baskets, orders, sessions.
- [x] **T2.2 Rate-limit fallback** (Claude: Netlify runtime detection, `CLIENT_IP_HEADER`, logged fallback; still to confirm the real header on staging) When the host IP header is missing in production, log an operational event and use the signed-in user id (or the guest capability) as the key instead of one shared bucket. Confirm which header Netlify provides at function runtime and whether `NETLIFY` is set there.
  Accept: unit test shows two anonymous users without a host header no longer share a bucket for actions that have a better key; staging check of the real header.
- [ ] **T2.3 Hosted Google sign-in** (needs `SERVICES.md` items 5 and 7) Production OAuth client, published consent screen named Bayou, staging and production callbacks.
  Accept: sign-in, reload, sign-out, sign-in again on staging over HTTPS.
- [x] **T2.4 MFA lockout** (Claude, branch `claude/compliance-quickwins`) After 10 wrong codes in an hour, lock step-up for that account for 15 minutes and audit it.

### ws4 Notifications

- [ ] **T4.1 Support contact** One `SUPPORT_EMAIL` config value used by the Contact page and legal text. Contact form sends through the existing email path with rate limiting.
- [x] **T4.2 Localized emails** (Claude, branch `claude/compliance-quickwins`) Gift notification and order confirmation in the recipient's locale.
- [ ] **T4.3 Delivery retries** Failed sends are stored and retried by the scheduled job instead of being dropped.

### ws5 Merchant and admin

- [x] **T5.1 Refund records** (Claude: merchant or admin records an accepted request as refunded with method and reference; buyer sees it; migration `20261102130000_refund_records`) Admin and merchant can record a refund done outside the app (who, when, provider reference, amount). Never auto-restock.
- [ ] **T5.2 Merchant order list** Paid orders only by default, buyer email hidden when anonymous.
- [ ] **T5.3 Admin step-up UX** Clear message and link to `/security` when a step-up is needed, in all three locales.

### ws8 Ops and QA

- [ ] **T8.1 Playwright e2e** Creator, giver (checkout off: gift reservation and external purchase paths), merchant, admin. Runs in CI on a `_test` database.
- [ ] **T8.2 Staging** Netlify site, Neon `staging` branch, Upstash staging database, R2 staging bucket, sandbox Stripe, checkout off.
- [ ] **T8.3 Backups** Run `npm run backup:create` and `npm run backup:restore-test` against staging; record time to restore.
- [ ] **T8.4 Alerts** Sentry alert to the owner; uptime check on `/api/health`.

## Wave 2: payments (needs owner decision and provider accounts)

- [ ] **T1.1 Merchant-direct provider** Implement the provider the owner gets approved (likely MonCash Business per merchant), using the existing adapter contract in `src/services/payment-foundation.ts`: per-merchant credentials encrypted, exact amount and currency check, signed verification, replay protection, reconcile job.
  Accept: recorded sandbox run with redacted logs; integration tests with the provider mocked; no platform-held funds.
- [ ] **T1.2 Diaspora card option** Only through a provider that accepts the owner's entity. Stripe stays sandbox until then.

## Wave 3: release

- [ ] **T9.1** Every gate in `docs/PUBLIC-RELEASE-GATES.md` has evidence.
- [ ] **T9.2** Owner walks all four journeys on staging on phone and laptop and signs off in `docs/DECISIONS.md`.
- [ ] **T9.3** Production env set by the owner, additive migrations deployed with approval, smoke test, 48 hours of monitoring.
