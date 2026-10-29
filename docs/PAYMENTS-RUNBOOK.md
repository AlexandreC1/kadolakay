# Payment MVP release runbook

## Scope

This release accepts USD card payments through Stripe Checkout only. PayPal, MonCash and Natcash are not enabled. Their callback routes return 503 and checkout never advertises them as available payment choices. No card data passes through KadoLakay.

KadoLakay is the merchant in this MVP. This does not implement automatic payouts to registry owners or local businesses. Before launch, decide who supplies and delivers each gift, who receives the Stripe settlement, how business vendors are paid, and who handles refunds and disputes. Do not represent the platform as a money transfer or escrow service.

Stripe onboarding requires a business and bank account in a supported country. Verify the merchant's eligibility before choosing this payment route. Haiti is not currently listed as a directly supported Stripe merchant country. A diaspora-owned business must use its genuine eligible legal details. Source checked 2026-10-25: https://stripe.com/global

## Required configuration

Set these through the hosting provider's encrypted environment settings, never in Git or client code:

- `DATABASE_URL`: PostgreSQL connection string, pooled URL for serverless runtime.
- `STRIPE_SECRET_KEY`: account-specific test key for staging, live key for production.
- `STRIPE_WEBHOOK_SECRET`: endpoint-specific signing secret, separate per environment.
- `NEXT_PUBLIC_APP_URL`: exact HTTPS origin of the deployed app.
- `CRON_SECRET`: randomly generated secret of at least 32 characters.
- `AUTH_RESEND_KEY` and verified `AUTH_RESEND_FROM`: optional delivery of order notifications. Payment completion does not depend on email success.

A publishable Stripe key is not required for this server-created hosted checkout. Never put the secret key in a NEXT_PUBLIC variable.

## Provision and deploy

1. Back up the database and apply `npx prisma migrate deploy`.
2. Run `npm run db:generate` during installation/build.
3. Create a Stripe webhook endpoint for `https://YOUR_DOMAIN/api/webhooks/stripe`.
4. Subscribe to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`.
5. Schedule GET `/api/internal/payments/reconcile` every five minutes with header `Authorization: Bearer YOUR_CRON_SECRET`. Use the host's scheduler or an authenticated external scheduler. Without this job, missed expiration webhooks can leave inventory held until manual reconciliation.
6. Run the staging acceptance checks below using Stripe test mode. Do not use live card data in tests.
7. Replace test keys with approved live credentials and repeat a small real payment plus refund under the merchant's supervision before public launch.

## Business rules enforced

- Only published public registries without a password can be purchased in the current MVP.
- All selected items must belong to the submitted registry, have a USD price and use an internal source.
- Quantities are bounded positive integers. Duplicate IDs, extra quantity keys and unrecognized form fields fail validation.
- Database decimals are converted to integer cents before total calculations. The transaction stores only its actual USD price, with no converted HTG totals or hidden platform fee. The current fee is zero.
- Orders are limited to $0.50 through $9,999.99. Shipping and sales tax are not automatically calculated; settle the merchant's pricing and tax policy before public launch.
- Stock is reserved by one conditional PostgreSQL update per item. All reservation writes and order creation share a transaction. Database constraints prevent negative or overfilled stock.
- Stripe sessions expire after 30 minutes. Signed expiration events release reservations. The return/cancel URL never confirms a payment or frees a still-payable session.
- Successful signed events must match the order's provider session, amount and USD currency. Payment, order status and reservation consumption commit together.
- Duplicate deliveries cannot fulfill twice. A failed database transaction returns HTTP 500 so Stripe retries.
- Confirmations use the unguessable Stripe session ID and retrieve provider details server-side. Order-number URLs no longer expose receipts or gift messages.
- External purchases can only be confirmed by the registry owner. They never record an online payment.
- User fields are HTML-escaped in transactional email.

## Failure recovery

If Stripe explicitly rejects session creation with an HTTP 4xx, the reservation is released. Network timeouts and HTTP 5xx are ambiguous: a payable session may exist, so stock remains held until reconciliation verifies the provider state. The job discovers sessions whose IDs were not saved, confirms paid sessions, closes open stale sessions before freeing stock, and releases expired sessions. A provider outage retains holds safely and logs only a generic code.

Monitor pending orders older than 45 minutes. Check reconciliation failures, Stripe webhook delivery failures and database capacity. At higher traffic, add a webhook event inbox and email outbox with retry queues; notification delivery currently remains best-effort after payment commits.

Do not run the migration blindly against legacy pending orders. Those were created before inventory reservations existed. Review and cancel or reconcile them before enabling new payments. Existing invalid stock rows must be corrected before adding the stock constraint.

Refund handling is manual in the Stripe Dashboard for this MVP. Refunding money does not automatically return a delivered gift to available registry stock. Record the refund and resolve registry fulfillment according to the actual delivery outcome. A self-service refund workflow and automated seller payouts are outside this release.

## Test gates

- `npm test`: unit tests cover strict checkout payloads, exact cents, HTML escaping, signature forgery rejection, unpaid completion rejection, evidence mismatch, duplicate fulfillment, retryable database failure and safe reconciliation ordering.
- `$env:RUN_DB_TESTS='1'; npx vitest run src/services/checkout.integration.test.ts`: actual PostgreSQL integration test uses isolated temporary records and a mocked provider network boundary. It sends 12 concurrent checkout attempts for one remaining gift, 12 duplicate fulfillment calls and 8 duplicate expiration calls. Expected: one buyer accepted, one fulfillment, one release, no overfilled stock. This does not claim that a live Stripe payment occurred.
- Staging: buy with Stripe's published test card, observe signed webhook and PAID order, then replay the same event. Expected: one gift fulfilled.
- Staging: decline a card, close checkout and wait for expiry. Expected: no paid order and released stock after webhook or reconciliation.
- Staging: delay webhook processing beyond the browser redirect. Expected: confirmation page says pending, then confirmed only after database commit.
- Staging: disconnect the database during completion and restore it. Expected: HTTP 500 followed by successful provider retry, exactly one fulfillment.
- Before live launch: run a merchant-approved small payment and refund, verify actual settlement destination, confirm fulfillment/support process and retain evidence with no secret values.

## Official references

- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/api/checkout/sessions/expire
- https://stripe.com/global

Registry availability is distinct from a retailer warehouse inventory. The MVP enforces the registry requested quantity and rechecks the linked product's in-stock flag, approved business status and unchanged USD price. It does not track a shared physical stock count across multiple registries. A changed catalog price makes the old gift unavailable until the owner replaces it with the current catalog listing.
