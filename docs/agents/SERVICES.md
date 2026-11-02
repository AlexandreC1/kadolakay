# Accounts the owner must sign up for (Bayou)

Agents never create accounts, accept terms or enter live keys. The owner does, then puts values in the host's environment settings, never in Git. Budget: 50 USD total for year one, free tiers first (`CLAUDE.md`). Free-tier limits change; check each pricing page before relying on it.

## Before anything is public

| # | Service | Why | Env vars | Notes |
|---|---|---|---|---|
| 1 | **Domain** | Email sender, OAuth branding, links | `NEXT_PUBLIC_APP_URL` | Code still sends from `noreply@kadolakay.com`. Confirm you own that domain, or pick a Bayou domain. Likely the only paid item. |
| 2 | **Cloudflare** (free) | DNS, R2 image storage, Email Routing for a support address | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION=auto`, `S3_PUBLIC_URL`, `SUPPORT_EMAIL` | Email Routing can forward `support@yourdomain` to your Gmail for free. |
| 3 | **Neon** Postgres (free) | Database | `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL` (migrations) | Separate `production` and `staging` branches. Never reuse the old KadoLakay database. |
| 4 | **Upstash Redis** (free) | Rate limiting. Production refuses sign-in and checkout without it | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | One per environment. |
| 5 | **Google Cloud** OAuth | Google sign-in | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | You already have a test-mode client for localhost. Production needs a published consent screen named Bayou and the callback `https://<domain>/api/auth/callback/google`. |
| 6 | **Netlify** (free) | Hosting | set in Netlify UI | Planned host (`netlify.toml`, hourly reconcile function). Vercel Hobby is for non-commercial use only. Watch Netlify credit usage; the free plan pauses when credits run out. |
| 7 | **Resend** (free) | Magic-link sign-in and transactional email | `AUTH_RESEND_KEY`, `AUTH_RESEND_FROM` | Verify the domain (SPF and DKIM records in Cloudflare). |
| 8 | **Secrets you generate** | Sessions, encryption, cron | `AUTH_SECRET` (`openssl rand -base64 32`), `DATA_ENCRYPTION_KEY` (`npm run security:setup`), `CRON_SECRET` (`openssl rand -hex 32`) | Different values per environment. Keep `DATA_ENCRYPTION_KEY` backed up offline: losing it makes MFA secrets, OAuth tokens and delivery addresses unreadable. |
| 9 | **Sentry** (free) | Error alerts | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Traces and replay stay off (privacy decision). |
| 10 | **Uptime monitor** (UptimeRobot or Better Stack, free) | Downtime alerts | none | Point at `/api/health`. |

Optional sign-in providers already coded: Microsoft (`AUTH_MICROSOFT_ENTRA_ID_*`) and GitHub (`AUTH_GITHUB_*`).

## Payments (later, after the legal and seller questions)

Bayou's recorded rule: each merchant is the seller and receives the money; Bayou never holds funds.

| # | Option | Status | What to find out |
|---|---|---|---|
| 11 | **MonCash Business** (Digicel) | Not built for merchant-direct yet; route returns 503 | Can each merchant connect their own MonCash Business account to a platform? Sandbox is self-serve; live needs onboarding. |
| 12 | **UNIBANK Unicarte affiliation** | Not built | Card acceptance for diaspora buyers: is there a web or API integration and can it settle to each merchant? |
| 13 | **Natcash** (NATCOM) | Not built | Is there a merchant API? |
| 14 | **Stripe** | Sandbox only | Stripe does not list Haiti for direct onboarding. Only useful if a merchant or entity in a supported country exists. |
| 15 | **PayPal** | Disabled | Check whether Haiti-registered business accounts can receive payments before any work. |

## Not services, but needed before launch

- A legal entity (or a decision to run as an individual) for the terms of service.
- A lawyer's review of privacy policy, terms, refund rules and the merchant agreement. Buyers in the US, Canada and elsewhere bring their own privacy rules.

## Sign-up order

1. Domain, Cloudflare (with Email Routing), Neon, Upstash.
2. Netlify staging site, Resend (verify domain), Google OAuth production client.
3. Sentry, uptime monitor.
4. Payment provider talks (MonCash Business, UNIBANK), in parallel with the legal review.
