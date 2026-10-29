# Free-service pilot setup

Status: local readiness work only, October 27, 2026. No production services or credentials are asserted as provisioned.

Target: Netlify Free app/API, separate Neon Free PostgreSQL, Upstash Free Redis, Cloudflare R2 Standard allowance, verified transactional sender. Reserve $15 for an available standard domain and $35 contingency within $50 TOTAL year one. No paid upgrades or automatic recharge. Do not deploy seed data as real inventory.

## Provisioning order

1. Connect owner accounts. Create separate test/staging and production resources. Prefer managed connectors or provider dashboards; do not paste keys into chat. The Neon plugin has been suggested but its connection is unconfirmed.
2. Create a PostgreSQL database with TLS and pooled app connections in a region close to the app runtime. Store `DATABASE_URL` only in environment secrets. Use a direct migration connection when required by the provider and existing migration script. Apply committed migrations explicitly. Do not use `db push` or demo seed for production.
3. Provision Redis and configure `UPSTASH_REDIS_REST_URL`/`TOKEN`. Test refusal and outage behavior on the actual host. Confirm `x-nf-client-connection-ip` cannot be supplied by the client; never fall back to arbitrary forwarding headers.
4. Connect the repository to Netlify. `netlify.toml` defines the build and `.next` output. Netlify supplies its Next.js adapter. Verify this exact Next.js version, Prisma engine packaging, nonce CSP, locale routes, callbacks, cache invalidation and function limits in a hosted preview before publication.
5. Configure `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `AUTH_URL` when required by Auth.js, actual Google credentials and exact OAuth callback for the hosted origin. Register a second agreed sign-in path. No fake local auth bypass is part of this plan.
6. Configure R2 S3 variables from `.env.example`, upload origin CORS, object ownership and a private backup bucket separately from public merchant photos. Verify actual signed upload length/type enforcement and content handling before enabling uploads.
7. Configure the sender domain and email keys. Measure quotas and delivery. An email failure must not reverse a committed payment.
8. Run `node scripts/check-pilot-env.mjs`. This checks names and formats without printing values; it is not integration proof.
9. Prove migration, backup/restore, monitoring, and full hosted journeys. Only then publish a controlled pilot. Purchase a domain only after the owner chooses an available name and reviews exact registration and renewal costs.

## Payment controls

Keep `CHECKOUT_ENABLED=false` until the commercial model and physical inventory gate pass. Provider test keys do not prove a supported live business account. Stripe is not assumed eligible for a Haiti-registered entity. Webhooks remain enabled to recover existing signed transactions even if new checkout is disabled.

The optional hourly function exits without network or DB activity unless `RECONCILIATION_ENABLED=true` and Stripe keys are configured. Its HTTP deadline is 24s, with no redirects or credential logs. The protected route uses a bounded batch on Netlify and short provider requests. The 30s scheduler limit is not a guarantee that all backlog fits; monitor age/failures and retest slow DB/provider operations. Aborting the HTTP caller does not undo an in-flight server transaction. Recovery must remain idempotent.

An hourly schedule may make expired holds visible longer than the prior five-minute proposal. Show honest availability and choose a business policy before live checkout. Do not free a reservation merely because a browser timer expires; provider state controls release. Very old sessions must not starve younger pending orders; monitor the backlog before enabling real orders.

## Quota and recovery gates

- Netlify Free: 300 credits/month, site pauses at exhaustion. Budget production deploys, bandwidth, function runtime and request volume, including abuse and recovery. Set alerts early and retain an emergency checkout-disable procedure.
- Neon Free: storage, compute and short history limits. Five-minute polling can stop scale-to-zero; measure actual compute. Verify a secure off-database backup and a restore drill. No backup implementation or recovery objective is claimed yet.
- Upstash/R2/email: check current limits before provisioning. Rate limits consume several commands, not one per user action. Object storage is not universally cost-capped; bound uploads and monitor use.
- Keep preview secrets/data separate from production. Account recovery, ownership, retention and the responsible operator must be documented.

Official references: https://www.netlify.com/pricing/ , https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ , https://docs.netlify.com/build/functions/scheduled-functions/ , https://neon.com/pricing , https://upstash.com/pricing/redis , https://developers.cloudflare.com/r2/pricing/ . Reverify quotas at setup time.

The prior Vercel workflow and `vercel.json` are historical alternatives, not Netlify deployment instructions. Do not run them to claim compliance with the annual budget.
