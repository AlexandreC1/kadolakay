# Bayou public release gates

Current owner decisions, October 29, 2026. Passing one gate never waives another.

## Confirmed business model

| Rule | Release requirement |
| --- | --- |
| BR-01: Haiti registration | Treat Haiti as the intended platform country. Do not configure a fictitious overseas merchant identity. Actual company/provider approval is still required. |
| BR-02: merchant-owned sales | Each merchant is the seller, receives the money, delivers and issues refunds. Bayou must not collect into its own account under an assumed seller model. |
| BR-03: diaspora buyers | Intended buyers include Haiti, the US, Canada, Dominican Republic, Brazil and Chile. This is not proof of acceptance by a processor, and does not automatically add new UI languages or charged currencies. |
| BR-04: future merchant fees | Transaction/click fees are future features. New merchant commission defaults to zero. Historical configuration and financial rows are preserved; no billing engine or billable-click definition is claimed. Sandbox checkout currently records zero platform fees. |
| BR-05: future premium | Premium user features need a separate entitlement/billing design. A subscription must never become an administrative role. No paid plan is being sold in this release. |
| BR-06: native checkout eligibility | Only linked approved merchant products qualify. Manual/custom gifts are not cash funds, and external purchase marking is not verified native payment. |
| BR-07: no live platform Stripe collection | The existing Stripe implementation is sandbox-only. It must not be activated for real Haiti marketplace sales by simply adding live keys. Webhook/recovery processing remains independent of new-checkout availability. |

Provider evidence: [Stripe global availability](https://stripe.com/global) does not list Haiti for direct merchant onboarding. [MonCash Business](https://moncashdfs.com/business) documents merchant wallet collection, sandbox testing and a separate live-onboarding process. It does not establish acceptance of international cards for every diaspora buyer. [UNIBANK merchant affiliation](https://www.unibankhaiti.com/enterprises/affiliation-unicarte/) describes Visa/Mastercard acceptance and business prerequisites; website/API integration and marketplace settlement still need confirmation. No provider is claimed live or approved.

## Independent release gates

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Source integration | Preserve approved Bayou UI, SUPERADMIN, onboarding, QR/privacy and physical inventory while incorporating reviewed Claude operational work; one rehearsed migration path | Open. PR #11 and Bayou remain separate schema lines. Never point both at the same database. |
| Authentication | Hosted Google plus agreed alternate method, HTTPS/cookie/origin tests, account session revocation and administrator step-up | Account-wide revocation implemented and tested locally. Hosted callbacks, alternate provider and admin MFA remain open. |
| Merchant payment | Haiti-eligible verified merchant account, direct recipient binding, exact amount/currency, signed verification, replay protection and real sandbox evidence | Open. Legacy Stripe is sandbox-only. No merchant-direct processor implementation is claimed. |
| Fulfillment/refunds | Merchant can accept, fulfill, cancel and refund with evidence and bounded support access | Open. A paid status is not delivery, and an exception marker is not a refund. |
| Hosted infrastructure | Separate TLS PostgreSQL databases/roles, shared limiter, storage policy, scheduler, verified email, quotas and outage behavior | Open. Approved free pilot targets Netlify plus Neon/Upstash/R2; account authorization and provisioning need actual evidence. |
| Recovery/observability | Backup restore, signed event recovery, reliable notifications, alert delivery and privacy-safe telemetry | Local audit/logging checks exist. Hosted restore, alerts and operational acceptance remain open. |
| Public experience | Full creator, giver, merchant and superadmin journeys; HT/FR/EN; keyboard/mobile/reduced-motion/network checks; no dead controls | Partial local evidence only. Must rerun against the integrated staging build. |
| Final release | All required tests and release-critical findings resolved, operating policies published, concrete owner review | Blocked by the open gates above. |

## Verification commands

`npm test`, `npm run test:db`, `npx tsc --noEmit`, `npm run lint`, `npm audit --audit-level=high`, `npm run build`, then `RUN_SESSION_HTTP_TESTS=1 npm run test:session:http` with a disposable loopback `_test` database. The HTTP harness launches its own production server and uses only fictional fixture accounts and an ephemeral test secret. It checks real encrypted-cookie acceptance/rejection; it is not a Google consent test.

Database integration files skipped in the ordinary unit command must pass separately under `test:db`. Do not label a skipped test as passed. Test commands refuse the normal local application database by default. Never seed demo merchants or copy real customer records into staging to make the UI appear populated.

## Budget and hosting

The ceiling remains $50 total for year one, with free services first. [Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to noncommercial use. [Netlify Free](https://www.netlify.com/blog/introducing-netlify-free-plan/) allows commercial projects; its current [credit limits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) require monitoring and can pause service. No paid upgrade or domain purchase is authorized by a successful test. Free tiers do not provide an unrestricted availability guarantee.
