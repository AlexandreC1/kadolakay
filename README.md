# KadoLakay — Haitian Community Gift Registry

**Kado pou tout okazyon, lakay ou.** *(Gifts for every occasion, from home.)*

KadoLakay is a gift registry platform built for the Haitian community — both in Haiti and across the diaspora. Create registries for baby showers, weddings, and birthdays. Share them on WhatsApp, Facebook, and SMS. Accept payments via MonCash, Natcash, Stripe, and PayPal.

---

## Why KadoLakay?

The Haitian community is spread across the globe. When someone in Port-au-Prince has a baby shower, family in Miami, Montreal, and Paris want to participate. KadoLakay bridges that gap:

- **Trilingual** — Haitian Creole (default), French, English
- **Local-first payments** — MonCash and Natcash for Haiti, Stripe/PayPal for the diaspora
- **Local businesses** — Haitian businesses can list products, customers buy directly
- **WhatsApp-first sharing** — the primary communication channel for the Haitian community

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | SSR, SEO, social sharing |
| Database | PostgreSQL (Neon serverless) | Prisma-compatible, free tier |
| ORM | Prisma 6 | Type-safe queries, migrations |
| UI | Tailwind CSS + shadcn/ui | Fast, accessible, responsive |
| Auth | Auth.js v5 (Google + email magic link) | Standard, extensible |
| i18n | next-intl | Best App Router i18n support |
| Payments | Stripe + PayPal + MonCash + Natcash | Full Haiti + diaspora coverage |
| Storage | S3-compatible (Cloudflare R2 / AWS S3) | Zero egress fees, portable |
| Email | Resend | Transactional + auth emails |
| Hosting | Vercel (portable to AWS via OpenNext) | Cost-effective, auto-deploy |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (local via Docker, or Neon for cloud)
- npm

### Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/kadolakay.git
cd kadolakay
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# 3. Set up the database
docker compose up -d            # Start PostgreSQL (optional, if using local DB)
npx prisma migrate dev          # Run migrations
npx prisma db seed              # Load demo data

# 4. Generate Prisma client
npx prisma generate

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the KadoLakay landing page in Haitian Creole.

### Demo Data

The seed script creates:
- **Marie Jean-Baptiste** — registry owner with 2 registries (baby shower + wedding)
- **Jacques Desrosiers** — business owner (Mezon Jacques, furniture)
- **Admin user** — for reviewing business applications
- **11 registry items** and **4 business products**

---

## Project Structure

```
kadolakay/
├── prisma/
│   ├── schema.prisma          # Database schema (12 models, all enums)
│   ├── migrations/            # Version-controlled schema changes
│   └── seed.ts                # Demo data for development
├── src/
│   ├── app/
│   │   ├── [locale]/          # All pages are locale-aware (ht/fr/en)
│   │   │   ├── (auth)/        # Login, register
│   │   │   ├── (registry)/    # Create, edit, view registries + checkout
│   │   │   ├── (business)/    # Business signup, dashboard, products
│   │   │   ├── (dashboard)/   # User dashboard, orders, settings, admin
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── loading.tsx    # Global loading state
│   │   │   ├── error.tsx      # Global error boundary
│   │   │   └── not-found.tsx  # 404 page
│   │   └── api/
│   │       ├── auth/          # Auth.js handlers
│   │       ├── og/[slug]/     # Dynamic OG image generation
│   │       ├── products/      # Business product browse API
│   │       └── webhooks/      # Stripe, PayPal, MonCash callbacks
│   ├── actions/               # Server Actions (all mutations)
│   │   ├── registry.ts        # Registry CRUD
│   │   ├── registry-item.ts   # Item management
│   │   ├── checkout.ts        # Order creation + payment initiation
│   │   ├── business.ts        # Business signup + products
│   │   ├── upload.ts          # Presigned URL generation
│   │   └── user.ts            # Profile updates
│   ├── components/
│   │   ├── ui/                # Base components (Button, Input, Card)
│   │   ├── layout/            # Header, Footer, LocaleSwitcher, MobileNav
│   │   ├── shared/            # ShareButtons, CurrencyDisplay, ImageUpload
│   │   └── registry/          # ProductPicker
│   ├── lib/
│   │   ├── auth.ts            # Auth.js configuration
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── email.ts           # Resend transactional emails
│   │   ├── orders.ts          # Order fulfillment (shared across webhooks)
│   │   ├── currency.ts        # HTG/USD formatting and conversion
│   │   ├── slug.ts            # URL slug generation
│   │   ├── payments/          # Payment provider abstraction
│   │   │   ├── index.ts       # Factory + interface
│   │   │   ├── stripe.ts      # Stripe Checkout
│   │   │   ├── paypal.ts      # PayPal REST API
│   │   │   ├── moncash.ts     # MonCash (Digicel Haiti)
│   │   │   └── natcash.ts     # Natcash (NATCOM Haiti)
│   │   ├── storage/           # S3-compatible file upload
│   │   └── validators/        # Zod schemas for all inputs
│   ├── i18n/
│   │   ├── messages/          # ht.json, fr.json, en.json
│   │   ├── routing.ts         # Locale config
│   │   ├── request.ts         # Server-side locale loading
│   │   └── navigation.ts      # Locale-aware Link, redirect, etc.
│   └── middleware.ts          # Locale detection + routing
├── .github/workflows/
│   ├── ci.yml                 # Lint + TypeCheck + Build pipeline
│   ├── deploy.yml             # Vercel deployment
│   └── db-migrate.yml         # Prisma migration (with human approval)
├── docs/
│   └── CI-CD-GUIDE.md         # Educational CI/CD documentation
└── docker-compose.yml         # Local PostgreSQL for development
```

---

## Architecture

### Payment Flow

```
Buyer selects items → createOrder() → payment provider creates session
     │
     ├─ Stripe  → Checkout Session → Stripe webhook (POST) → fulfillOrder()
     ├─ PayPal  → Order + Redirect → Return URL (GET) → fulfillOrder()
     ├─ MonCash → Payment + Redirect → Return URL (GET) → fulfillOrder()
     └─ Natcash → Manual instructions → Admin confirms → fulfillOrder()
```

All payment webhooks converge on `fulfillOrder()` which:
1. Checks idempotency (skip if already PAID)
2. Uses a Prisma transaction (all-or-nothing)
3. Atomically increments fulfilled quantities
4. Sends notification emails (fire-and-forget)

### i18n Strategy

- Default locale: `ht` (Haitian Creole) — no URL prefix
- Other locales: `/fr/...`, `/en/...`
- All UI text uses `next-intl` translation keys
- Creole is always 100% complete; other languages follow

### Security

- Auth.js v5 with session-based authentication
- All server actions verify `auth()` before mutations
- Webhook signature verification (Stripe)
- Input validation with Zod schemas on all forms
- Mass assignment prevention (field whitelists)
- Atomic operations prevent race conditions
- Idempotent webhook handling (safe retries)
- No hardcoded secrets (all via env vars)

---

## Available Scripts

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript check (no output)
npx prisma studio    # Visual database browser
npx prisma migrate dev   # Create and run migrations
npx prisma db seed       # Load demo data
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables. Key ones:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Auth.js session encryption |
| `AUTH_GOOGLE_ID/SECRET` | Yes | Google OAuth |
| `AUTH_RESEND_KEY` | Yes | Email (magic links + notifications) |
| `STRIPE_SECRET_KEY` | For Stripe | Payment processing |
| `MONCASH_CLIENT_ID/SECRET` | For MonCash | Haiti mobile payments |
| `S3_*` | For uploads | Image storage |

---

## CI/CD

See [`docs/CI-CD-GUIDE.md`](docs/CI-CD-GUIDE.md) for a comprehensive guide.

**Pipeline:** Every PR runs Lint + TypeCheck + Build in parallel. All must pass before merging.

**Branch protection:** Direct pushes to `main` are blocked. All changes go through PRs.

---

## Deployment

**Recommended:** Connect the repo to [Vercel](https://vercel.com/new) for automatic deploys.

**Manual:** See `.github/workflows/deploy.yml` for Vercel CLI deployment.

**AWS migration:** The app uses no Vercel-specific APIs. Switch to AWS via [OpenNext](https://open-next.js.org/) when ready.

---

## License

Private — All rights reserved.
