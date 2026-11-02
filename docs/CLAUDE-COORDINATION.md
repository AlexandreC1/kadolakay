# Concurrent Claude Code coordination

Confirmed November 2, 2026: Claude Code processes are running in VS Code and as a CLI. Their conversations and exact working directory are not automatically visible. Recent remote commits are evidence of changes, not proof of tool authorship. The original two other managed worktrees were clean at inspection.

Our changes remain isolated on codex/offline-completion based on product-foundations17a77c2. No merge, cherry-pick or reset from the concurrent branches has been performed.

## origin/design/brand-system

607cb30 design: "Nuit" visual system, live hero demo, user theme picker

Overlapping files:

- package.json
- prisma/schema.prisma
- src/actions/checkout.ts
- src/actions/registry-item.ts
- src/actions/registry.ts
- src/app/[locale]/(business)/business/orders/page.tsx
- src/app/[locale]/(business)/business/products/ProductList.tsx
- src/app/[locale]/(dashboard)/admin/businesses/AdminBusinessList.tsx
- src/app/[locale]/(dashboard)/orders/page.tsx
- src/app/[locale]/(registry)/r/[slug]/checkout/CheckoutForm.tsx
- src/app/[locale]/(registry)/r/[slug]/edit/RegistryEditForm.tsx
- src/app/[locale]/(registry)/r/[slug]/edit/page.tsx
- src/app/[locale]/(registry)/r/[slug]/page.tsx
- src/app/[locale]/layout.tsx
- src/components/layout/MobileNav.tsx
- src/components/layout/UserMenu.tsx
- src/lib/auth.ts
- src/lib/validators/registry.test.ts
- src/lib/validators/registry.ts
- src/types/next-auth.d.ts

## origin/fix/api-routes-locale

c8337b2 fix(proxy): keep /api routes out of the locale middleware

Overlapping files:

- package.json
- prisma/schema.prisma
- src/actions/checkout.ts
- src/actions/registry-item.ts
- src/actions/registry.ts
- src/app/[locale]/(dashboard)/orders/page.tsx
- src/app/[locale]/(registry)/r/[slug]/checkout/CheckoutForm.tsx
- src/app/[locale]/(registry)/r/[slug]/edit/page.tsx
- src/app/[locale]/(registry)/r/[slug]/page.tsx
- src/components/layout/UserMenu.tsx
- src/lib/auth.ts
- src/lib/validators/registry.test.ts
- src/lib/validators/registry.ts
- src/types/next-auth.d.ts

Coordinate ownership before combining design, navigation, registry pages, merchant orders and account UI. Preserve the new service-layer business/security checks while adapting presentation. Do not apply migrations from a different Prisma/schema lineage to the owner database. Run the complete gates on the combined result before any merge or deployment.

The overlap list compares each branch with its merge base, so it includes earlier divergent work as well as the most recent commit. The API-locale tip itself changes only src/proxy.ts. Treat it as a comparison aid, not a claim that Claude is editing every listed file right now.
