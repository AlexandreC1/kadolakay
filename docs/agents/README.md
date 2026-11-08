# Agent playbook: Bayou

Start here. Any coding agent (Claude Code, Codex, a subagent) working on Bayou reads this folder first. Written 2026-11-02 from a review of `codex/offline-completion` (`9754b15`) and the local Codex branch `codex/quality-loop` (`d32a2a9`).

**Bayou is the only product.** The old KadoLakay line (`main`, `design/brand-system`, `fix/*`, `ws*/*`) is retired. Do not build on it. Copy ideas from it only through a task in `WORKSTREAMS.md`.

Read in this order:

1. `STATUS.md`: what is done, what is broken, what is left.
2. `WORKSTREAMS.md`: tasks split into workstreams that can run in parallel.
3. `SERVICES.md`: accounts the owner must create. Agents never create them.
4. The repo's own docs, which stay authoritative for product rules: `CLAUDE.md`, `docs/DECISIONS.md`, `docs/HANDOFF.md`, `docs/PUBLIC-RELEASE-GATES.md`, `docs/OFFLINE-COMPLETION.md`.

Also obey `AGENTS.md`: Next.js 16 differs from older versions. Read `node_modules/next/dist/docs/` before changing framework behaviour. Middleware lives in `src/proxy.ts`.

## Hard rules

- Base branch: `codex/quality-loop` (Codex's newest Bayou work, local on the owner's PC) until the lead creates `integration/bayou` (task T0.2). Never base work on `main`.
- Never edit a checkout that Codex or `npm run quality:loop` is using. Each agent gets its own worktree (`docs/QUALITY-LOOP.md`).
- Never commit `.env`, keys, tokens, OAuth secrets, cookies, database URLs or customer records.
- Checkout stays off (`CHECKOUT_ENABLED` unset). No live payment keys. Stripe is sandbox only. Each merchant is the seller and receives the money (DECISIONS.md, BR-02).
- No authentication or payment bypass, no demo merchants or fake inventory in any shared database.
- Migrations are additive. Never reset or seed a non-test database. Tests run only against a database whose name ends in `_test`.
- Business logic lives in `src/services/**`. Server actions in `src/actions/**` only parse input, call `requireActor(permission)`, and call a service. Never trust client prices, user IDs or roles.
- Every user-facing string in ht, fr and en. Kreyòl is the default and must be complete.
- No em dashes, emoji, AI-generated images or invented testimonials, business facts, prices or legal claims. Mark unknowns `TODO(owner):` and list them in the PR.
- Infrastructure budget: 50 USD total for year one. Free tiers first.
- No force push. No direct push to the base branch. Everything goes through a PR.

## Splitting the load

One **lead** agent owns ws0, lands all schema changes, and is the only one that merges. Up to four **worker** agents run at once, each on a different workstream, each in its own git worktree:

```
git worktree add ../bayou-ws5 -b ws5/T5.1-refund-records integration/bayou
```

Workstream ownership. `.github/ownership.json` is authoritative and CI enforces it on `ws<N>/*` branches (`npm run ownership:check -- <branch>` locally). Summary:

| WS | Area | Owns |
|---|---|---|
| ws0 | Foundations | root config files, `.github/**`, `prisma/**`, `scripts/**`, `netlify/**`, `src/lib/db.ts`, `src/types/**`, audit helpers, `docs/DECISIONS.md`, `docs/agents/**` |
| ws1 | Payments, checkout, stock | `src/lib/payments/**`, `src/lib/orders.ts`, `src/lib/checkout-attempt.ts`, `src/lib/release-payment-guard*`, `src/services/{checkout,inventory,reconcile-payments,payment-foundation}*.ts`, `src/actions/checkout.ts`, `src/app/api/webhooks/**`, `src/app/api/internal/**`, checkout pages |
| ws2 | Auth, sessions, security, account | `src/lib/{auth,auth-config,auth-email,encrypted-auth-adapter,session-claims,client-ip,rate-limit,security,security-crypto,totp}*.ts`, `src/lib/{mobile-token,google-id-token}.ts`, `src/proxy.ts`, `next.config.ts`, `src/services/{device-sessions,mfa,mobile-auth,sessions,authorization,permissions,backoffice-auth}*.ts`, `(auth)/**`, `security/**`, `settings/**`, `src/actions/user.ts`, `src/app/api/mobile/**` |
| ws3 | Registries, baskets, catalog, discovery | `src/services/{registry*,baskets-privacy,catalog*,discovery,registry-qr,registry-finder,pledges,mobile-api}.ts`, `src/lib/{registry-*,gift-discovery,seasons,occasions,directory}.ts`, `src/lib/validators/**`, `src/actions/{registry*,baskets,foundations}.ts`, `(registry)/**` except checkout, `discover/**`, `registries/**`, `src/components/registry/**`, `src/app/api/{og,registries,products}/**`, `src/lib/storage/**`, `src/actions/upload.ts` |
| ws4 | Email and notifications | `src/lib/{email,brand,mobile-email}.ts` |
| ws5 | Merchant and admin operations | `src/services/{order-operations,order-contact,order-reads,guest-orders,merchant-workspace,backoffice,business*,campaigns,product-foundations}.ts`, `src/actions/{workspaces,tracking,business}.ts`, `admin/**`, `(business)/**`, `track/**`, `purchases/**`, `premium/**` |
| ws6 | UI system, copy, i18n, legal pages | `src/app/globals.css`, `src/components/{ui,layout,theme,hero,animate-ui,onboarding,shared}/**`, `src/i18n/**`, `src/lib/*-copy.ts`, `src/app/[locale]/{page,layout,error,not-found,loading}.tsx`, new `(legal)/**`, `public/**`, the Expo app in `mobile/**` |
| ws8 | Ops, monitoring, QA, docs | `src/app/api/health/**`, `src/instrumentation*.ts`, `sentry.*`, `src/lib/{operational-events,monitoring-privacy}.ts`, `e2e/**`, `playwright.config.ts`, `docs/**` |

Shared by everyone: tests (`*.test.ts(x)`, `*.test.mjs`), `docs/HANDOFF.md`. New translation keys go in a `_pending/ws<N>.json` file that ws6 merges.

Schema changes are serialized: a worker writes the migration request (model, fields, reason) in its PR body; the lead lands it first; the worker rebases.

Waves (task IDs in `WORKSTREAMS.md`):

- **Wave 0**, lead alone: rescue local work, set the base, ownership map, env template.
- **Wave 1**, parallel: legal and account rights, UI fixes, auth hosting prep, notifications, merchant and admin hardening, e2e and staging.
- **Wave 2**, after the owner has a merchant payment provider: merchant-direct payments.
- **Wave 3**, lead plus ws8: release gates in `docs/PUBLIC-RELEASE-GATES.md`.

## Worker prompt template

```
You are the ws[N] agent on Bayou (github.com/AlexandreC1/kadolakay).
Read docs/agents/README.md, docs/agents/STATUS.md, task [ID] in docs/agents/WORKSTREAMS.md,
and CLAUDE.md, docs/DECISIONS.md, docs/HANDOFF.md.
Base: [base branch]. Work on branch ws[N]/[ID]-[slug] in a new worktree.
Edit only files ws[N] owns, plus tests and _pending/ws[N].json.
Done means every acceptance check in the task passes and the verification commands are green.
Open a PR with the template in docs/agents/README.md. Do not merge.
If blocked by another workstream, a missing account or an owner decision, stop and say exactly what you need.
```

## PR body template

```
Task: [ID] [title]
Workstream: ws[N]
What changed: [2-4 lines]
Acceptance: [each check from WORKSTREAMS.md, pass/fail, evidence]
Verification: lint / tsc / unit / test:db / build / browser path: [results]
Migration needed from ws0: [none | model + fields + reason]
Owner decisions needed: [none | list with TODO(owner) locations]
Files outside my workstream I needed: [none | list]
```

## Verification commands

```
npm ci
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
npm run test:db            # disposable *_test database only
npm run build
npm run test:quality-loop
npm run test:ownership
RUN_SESSION_HTTP_TESTS=1 npm run test:session:http
```

Do not report a skipped test as passed. On Windows, stop the dev server before `npm run build` (Prisma engine DLL lock).

## When a task is done

Tick it in `WORKSTREAMS.md` with the PR link (lead applies the tick at merge) and update `docs/HANDOFF.md` per `CLAUDE.md`.
