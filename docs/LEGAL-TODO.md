# Legal pages: facts the owner must supply

The Privacy, Terms and Contact pages (`src/lib/legal-copy.ts`, version `2026-11-02-draft`) show a "Draft for review" notice. They only state what the code does and what `DECISIONS.md` records. Before launch, the owner provides the items below, a lawyer reviews the text, and the draft notice is removed.

## Facts to supply

- [ ] Who operates Bayou: legal entity name (or individual), country of registration, postal address.
- [ ] Support address: set `SUPPORT_EMAIL` in each environment (a mailbox someone reads).
- [ ] Governing law and where disputes are handled.
- [ ] Minimum age to create an account.
- [ ] Retention periods: closed accounts' tombstones, order records, archived lists, device sessions, email logs, error reports, uploaded images.
- [ ] Final list of service providers to name (planned: Netlify, Neon, Upstash, Cloudflare R2, Resend, Sentry, Google sign-in).
- [ ] Whether cross-border transfer wording is needed for buyers in the US, Canada, Dominican Republic, Brazil and Chile.
- [ ] Merchant agreement: obligations, suspension rules, what happens to merchant records when a merchant leaves.
- [ ] Refund and delivery policy wording once merchant-direct payments are chosen.
- [ ] Fees: confirm "no fees today" stays true at launch.

## Known gaps in account deletion

- Uploaded photos are deleted from storage after the account deletion commits, but only when no remaining row still uses them (a product photo copied into someone else's list stays). Cleanup failures are logged as `upload_cleanup`, not retried.
- Guest purchases made while signed out are not linked to the account, so they are not scrubbed.
- Merchants with order history must be closed by support.
