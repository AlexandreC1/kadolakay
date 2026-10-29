@AGENTS.md

# KadoLakay continuation instructions

Read `docs/IMPLEMENTATION-PLAN.md`, `docs/HANDOFF.md`, and `docs/DECISIONS.md` before changing code. They preserve the approved scope, current evidence, and unresolved launch decisions. Update the handoff and decision log at each completed gate.

This is an existing, heavily modified working tree on `codex/ship-ready-mvp`. Preserve all changes. Do not reset, overwrite, reseed, or treat untracked source as disposable. Never copy `.env`, credentials, cookies, OAuth tokens, or customer records into documentation or deliverables.

The first-year infrastructure ceiling is $50 TOTAL. Free services first. Target pilot: Netlify, Neon PostgreSQL, Upstash Redis, R2 object storage, transactional email, then an owner-selected available domain. No paid subscription, domain purchase, or claimed hosted success without actual evidence. Do not deploy seeded demo merchants as real inventory.

User wants Haitian-inspired, professionally composed UI and purposeful real 3D. Owner-selected mint HSL 170.6 76.9% 64.3% replaces the previous blue/coral accent; use evergreen ink and related neutrals. No AI-generated pictures, emoji, em dashes, fabricated testimonials, or decorative widgets copied as a finished design. PMNDRS caustics and React Bits carousel are inspirations. The carousel `/demo` is not the approved product design. Owner selected A / Lakou with B / Atelye product detail on October 27, 2026. Follow that confirmed direction and its refinements.

Use the Next.js documentation shipped in `node_modules/next/dist/docs/` before changing framework behavior. Follow the service-layer pattern for business logic. Read current session identity and database role/ownership for mutations; validate strict runtime input; never trust client prices or user IDs.

Checkout defaults disabled. `CHECKOUT_ENABLED=true` is an explicit operator decision, not a deployment default. Only linked approved merchant products are eligible for native checkout. Manual/custom/external gifts are not cash funds. Do not enable live payments before confirming entity country, seller, fulfillment/refund/settlement model, physical inventory, and live provider evidence.

Run the affected checks: `npm test`, `npm run test:db` (local or designated disposable DB only), `npx tsc --noEmit`, `npm run lint`, production build, and actual browser paths. Database tests mock the Stripe boundary, so do not claim they verify banking or OAuth. Windows running dev can lock Prisma's engine DLL; stop the owned dev process before full `npm run build` or use direct Next build only with an already valid generated client and disclose it.

Keep source, test evidence, blockers, and next steps precise. A local passing page is not deployment proof. Never weaken security or hide failing release gates to produce a successful status.
