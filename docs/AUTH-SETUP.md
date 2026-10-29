# Sign-in setup and release gate

The app uses Auth.js with the Prisma adapter and PostgreSQL. It does not use a shared demo password or bypass OAuth. OAuth account linking remains disabled by default: matching email addresses do not grant access to an existing account through a different provider.

## Required foundation

1. Provision PostgreSQL and apply the checked-in migrations.
2. Set `DATABASE_URL` to the application connection string. Never expose it as a `NEXT_PUBLIC_` variable.
3. Generate a unique random `AUTH_SECRET` with at least 32 random bytes. Store it in deployment secrets. Do not commit `.env`.
4. Set `AUTH_URL` to the canonical HTTPS production origin if the host does not reliably infer it. Set `NEXT_PUBLIC_APP_URL` to the same origin.
5. Use the real production domain in each identity provider console. Production callback URLs require HTTPS. Local testing may use `http://localhost:3000`.

## Google

Create a Web application OAuth client in Google Cloud. Configure the consent screen, required public homepage/privacy/terms URLs, and authorized JavaScript origin. Use only basic `openid`, `email`, and `profile` scopes. Add each exact redirect URI:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` server-side, then restart/redeploy. If the consent app is in testing mode, add the test users. Publish the consent app and resolve any Google verification requirements before opening registration to everyone.

## Microsoft personal, work, and school accounts

Register an app in Microsoft Entra. Choose supported account types to include personal Microsoft accounts if desired. Create a client secret and use its value, not its ID. Add the Web redirect URI `/api/auth/callback/microsoft-entra-id` on each origin.

Set `AUTH_MICROSOFT_ENTRA_ID_ID` and `AUTH_MICROSOFT_ENTRA_ID_SECRET`. The default issuer is `https://login.microsoftonline.com/common/v2.0/`. For a tenant-restricted app, set `AUTH_MICROSOFT_ENTRA_ID_ISSUER` to that tenant's issuer instead.

## GitHub

Register an OAuth App with callback `/api/auth/callback/github` on the selected origin. GitHub OAuth Apps use one callback URL, so separate local and production apps are recommended. Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` server-side.

## Email links

Verify a sending domain with Resend, configure its DNS records, and set `AUTH_RESEND_KEY` and `AUTH_RESEND_FROM`. Links expire after 15 minutes and are single use. The UI reports a delivery request as accepted only after Auth.js reports success. It does not claim inbox delivery.

## Acceptance checklist

- [ ] PostgreSQL migration and reachability check pass.
- [ ] Google consent redirects back, creates one user/account, and reaches the localized dashboard.
- [ ] Repeat Google sign-in reuses the same user and account.
- [ ] Microsoft and GitHub callbacks pass for the providers enabled in production.
- [ ] Cancelled consent returns a helpful message and permits retry.
- [ ] A different provider with an existing email cannot take over that account.
- [ ] External callback URL attempts return to the application origin.
- [ ] Email link succeeds once; reused and expired links show an actionable message.
- [ ] Missing providers are absent from the form, rather than clickable broken buttons.
- [ ] Session expires, sign-out works, and a removed user cannot reuse an old JWT.
- [ ] Removing admin/business role takes effect on the next server session resolution.
- [ ] Rate limiting is enabled with shared storage in production.

Automated coverage: `npm exec vitest run src/lib/auth-config.test.ts` checks provider readiness, credential redaction, redirect attacks, and bounded public error mapping. This does not replace real provider consent/callback testing. Provider credentials and account-owner consent cannot be fabricated or bypassed.

References: https://authjs.dev/getting-started/providers/google and provider documentation bundled in the installed Auth.js package.
