# Bayou status

Snapshot 2026-11-02 evening. Newest Bayou code: local Codex branch `codex/quality-loop` (`d32a2a9`, adds a bounded test-and-repair loop) on top of GitHub branch `codex/offline-completion` (`9754b15`). Claude's work sits on top as `claude/compliance-quickwins` (patches in `work/claude-handoff/`; not on GitHub because Claude has no push access yet).

## Warning: the app on the owner's screen is not on GitHub

The owner's running site (2026-11-02 screenshot) shows the Bayou name and mint colours with the phone-mockup hero from the retired `design/brand-system` branch ("a offert un cadeau", three language pills, "Créer un compte"). No Bayou branch on GitHub or in the Codex work folder contains it; Codex's three Bayou checkouts were clean. That combination lives in a folder not yet found (possibly a Claude Code checkout under `AppData\Local\Temp`). Task T0.1 rescues it.

## Done (in `9754b15`)

**Product**
- Registries: create, draft, publish, archive; public, unlisted or password-protected (scrypt, signed 30 min grants); opt-in search visibility; QR share cards; shared-link finder with camera scan.
- Baskets: private by default, personal and shared gifting modes, owner editing, explicit sharing.
- Catalog: merchant registration with patente number, admin approval, product editing, shared physical stock with reservations, bulk gift picker, business directory.
- Discovery: `/discover` budget and occasion suggestions, seasonal presets with an off switch.
- Onboarding: two-step welcome with occasion choice.
- Merchant workspace: per-seller fulfilment, delivery details, refund requests (records only, no money moves).
- Guest buyers: private tracking link (capability code), delivery details encrypted at rest, refund or contact requests.
- Admin: overview, accounts, suspensions, role delegation, merchants, orders, audit log, seasons, Premium pilot grants.
- Premium: pilot access only. No pricing or billing.
- Light, dark and system themes; Kreyòl, French, English.

**Security**
- Per-device sessions (24 h, max 20 per user), role and suspension re-read from the database on every request, sign-out everywhere and per device.
- Admin actions need a TOTP step-up within 15 minutes, with replay protection and one-time recovery codes.
- OAuth tokens, MFA secrets and delivery contacts encrypted with AES-256-GCM, key rotation supported.
- Deny-by-default permission map; every action goes through `requireActor`; append-only audit tables.
- Nonce-based CSP with `strict-dynamic`, HSTS, frame denial, nosniff, camera allowed only on `/find`.
- Rate limiting through Upstash, fails closed in production; client IP taken only from the host's own header.
- Checkout: server-side prices, approved merchant products only, Stripe signature plus amount check, reconcile job. Checkout is off by default; PayPal and MonCash return 503.
- Emails escape all user text. OG and QR routes serve only public, unprotected, published registries.
- No secrets found in any branch of the public GitHub repo.

**Quality (Codex's own report, `docs/OFFLINE-COMPLETION.md`)**: 338 unit tests, 55 PostgreSQL tests, 32 production HTTP checks, typecheck and build pass, lint 0 errors. Independent check on 2026-11-02 in a Linux sandbox: lint 0 errors (14 warnings), 314 of 314 runnable unit tests pass; Prisma-dependent suites and typecheck could not run there because the sandbox blocks Prisma engine downloads. `npm audit --omit=dev`: 5 moderate, 0 high.

## Added by Claude on 2026-11-02 (`claude/compliance-quickwins`)

- Draft Privacy, Terms and Contact pages in ht/fr/en with footer links; support address from `SUPPORT_EMAIL` only.
- Settings: download my data (JSON, no secrets) and delete my account (tombstone, scrubbed purchases, audited; blocked for admins, active orders, open refunds, merchants with order history).
- Rate limiting identifies Netlify functions correctly (`NETLIFY=true` is build-time only).
- `.env.example` and release check: `DATA_ENCRYPTION_KEY`, `DIRECT_DATABASE_URL`, `SUPPORT_EMAIL`, `CLIENT_IP_HEADER`.
- Transactional emails in the recipient's language.
- Admin authenticator lockout: 10 wrong codes per hour pauses step-up for 15 minutes (additive migration `20261102120000_mfa_lockout`).
- Workstream ownership map and CI check.

## Broken or risky

1. **Local work not on GitHub** (see warning above).
2. **Legal pages are drafts.** Owner facts and a lawyer's review are still needed (`docs/LEGAL-TODO.md`).
3. **Rate-limit header** still needs confirming on a real Netlify deploy (the fallback now logs `client_ip_unverified`).
4. **No real payment path for Haiti.** Merchant-direct provider not chosen; checkout off.
5. **Two copy systems**: next-intl JSON plus 13 `src/lib/*-copy.ts` files with inline translations. Easy to miss a language.
6. Nothing hosted: no staging, production database, verified email domain, alerts or backup restore on a real host.
7. Code style is very dense (many statements per line), which slows review.

## Left (tasks in WORKSTREAMS.md)

Rescue local work; set the base branch; owner facts for the legal pages; UI fixes from the owner's screenshot; consolidate copy; confirm the Netlify IP header; hosted Google sign-in; staging and production on the free stack; e2e tests; backups and alerts; merchant-direct payments; release gates.

## Retired

Old KadoLakay branches: `main`, `design/brand-system`, `fix/api-routes-locale`, `fix/business-rules`, `fix/next-security`, `codex/fix-payment-recovery`, `integration/wave1`, `ws0`..`ws7` branches, and the 69 uncommitted files in `C:\Users\charl\kadolakay`. Do not delete them without the owner's yes. Useful parts to port: legal page text, account deletion and export, email outbox with retries.
