# Payment recovery fixes, 2026-10-29

Base: GitHub main `714697a`. Branch: `codex/fix-payment-recovery`.

This fixes the five findings in the Claude changes review. It does not merge the separate Bayou branch into main. Bayou's local UI, owner account and Prisma 7 database are untouched. Do not apply this Prisma 6 migration history to that database.

## Behavior

- Provider verification still requires exact order, amount, currency and COMPLETED status.
- Payment completion, conditional order claim, item increments, manual-confirm audit and email outbox commit in one transaction. Any failure rolls everything back.
- Recovery includes locally FAILED/EXPIRED and historical COMPLETED-but-unfulfilled orders. Settled payments and uncertain captures do not age out of the seven-day unpaid-checkout window. Last-reconciled ordering rotates bounded batches.
- PayPal cron verification is GET-only. It never captures an approved order. Browser returns inspect first, repair existing captures, and only initiate capture after obtaining a persisted hold under item/order locks. Expired orders cannot initiate capture.
- An uncertain capture keeps its reservation until provider verification establishes settlement or VOIDED. A timeout is not evidence that no money moved. VOIDED releases the hold transactionally. Long-running uncertain cases require operational review; this change does not invent a refund or cancellation API.
- Checkout and fulfillment count other active reservations, including uncertain captures. Late paid orders cannot steal these reservations and become NEEDS_REFUND if they no longer fit.
- Local merchant products must be available when added. Checkout rechecks product existence, in-stock/deleted state, merchant approval and matching business ownership under shared catalog locks. Existing registry snapshots do not authorize purchases from a suspended merchant.
- Removed admin links to unimplemented orders, Natcash-confirmation and user-management screens. Natcash remains disabled by default.

## Migration / rollout

`20261029170000_capture_reservation` adds nullable `payments.captureRequestedAt` and `payments.lastReconciledAt`, plus a reconciliation index. Existing records are preserved. Apply with `prisma migrate deploy` to the main-line database before deploying code. Verify a backup/restore path and use the correct database; migration success against the disposable test database is not proof of compatibility with the separate Bayou schema.

For historical PayPal split commits, the next recovery run or buyer return can repair fulfillment using the existing provider capture. For older FAILED payments outside the default seven-day recovery window, investigate provider settlement records explicitly. NEEDS_REFUND requires a real refund process; no automatic refund feature is claimed.

## Verification

- 214 unit/route tests, including return retries, no-capture recovery, mismatched provider references, unapproved orders, pending captures, capture timeouts and the original three review regressions.
- 12 real PostgreSQL checks in `scripts/payment-recovery.integration.ts`: forced transaction rollback and retry; concurrent duplicate settlement; reused provider transaction; late-payment reservation ownership; expired recovery; persistent uncertain captures; VOIDED release; five capture-versus-expiry races; historical split-commit recovery; old uncertain captures; reconciliation rotation; catalog eligibility.
- Test migrations were applied to a fresh, separate PostgreSQL 18 cluster on loopback port 55433. No app database or real provider was used.

Run database checks only against the disposable database `postgresql://<local-user>@127.0.0.1:55433/review`, with DATABASE_URL and DIRECT_URL pointing there and ALLOW_PAYMENT_INTEGRATION=1, then `npm run test:payments:db`. The script rejects other hosts, ports and database names because it installs a temporary failure-injection trigger. Do not store real data in this test database. The suite removes its fixtures and trigger.

Remaining release work: reconcile Bayou/main schemas and feature parity, run real provider sandbox flows with deployment configuration, verify monitoring and refund operations, and keep live checkout gated until the operating rules are confirmed. This patch alone is not a production launch approval.
