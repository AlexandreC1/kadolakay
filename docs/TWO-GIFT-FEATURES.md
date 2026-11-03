# Gift discovery and registry multi-selection

Implemented on codex/two-gift-features, based on the restored Bayou design/login branch. No dependency addition or database schema change. The active local preview is the existing Claude checkout; only these feature files were synchronized after checking for concurrent edits.

## Use

1. Open /fr/gifts, /en/gifts or /ht/gifts from Find a gift in desktop/mobile navigation. Choose HTG or USD, a maximum price per gift and an occasion, optionally search a product/merchant name, then apply the filters. Empty results, invalid budgets, unavailable service and loading have explicit states. Clear the budget for no maximum. Applying new filters clears the selection; pagination preserves it.
2. Sign in and choose a registry on that page, or open My registries, edit a registry, and choose gifts from merchants. Select up to 50 products and add them together. Products already in the registry are marked; successful save refreshes the registry and reports added/existing counts. Selection is retained after a failed save. The native modal supports keyboard focus, Escape and focus return.

## Business and security rules

- Public search returns only in-stock, non-deleted products from approved merchants whose owners are active. Price filtering uses exact decimal input in the selected currency, with no conversion, and excludes products lacking that currency's price. Results are sorted by price then unique ID and capped at 24 per cursor page. No external recommendation model or exchange-rate call.
- Occasion matching is a transparent rule based on product names/categories in Creole/French/English. It depends on merchant catalog quality; it does not invent relevance or fallback to unrelated products when empty. The budget is per item, not an entire basket budget.
- Save accepts only registryId and a bounded list of productIds. The current server session supplies identity. Ownership, ban/deletion, registry status, current catalog eligibility and capacity are checked again server-side.
- Transaction locks the registry row, copies authoritative merchant title/description/prices and inserts only missing products. Any unavailable product rejects the entire batch. Concurrent retries are serialized and do not double-add products. Maximum 500 rows per registry bounds storage abuse. The old single-product action now calls the same controller/service.
- Adding a gift is not a purchase or stock reservation. Checkout still has to validate current merchant/product/stock/price/payment rules separately. No provider activation or transactional currency change is part of these features.
- New registryMutation limiter fails closed in production without shared Redis, following the existing explicit preview override policy. No bypass route, client-supplied owner, client price or schema migration.

## Evidence

219 unit tests in 39 files pass, including strict inputs, exact decimal filters, ownership, bans/archived registries, duplicate IDs/existing products, unavailable products and capacity. TypeScript and lint pass (0 errors, 21 existing warnings). Production build verified. scripts/verify-gift-features.ts additionally exercises real PostgreSQL atomic failure and overlapping transactions, eligibility, exact 0.10 budget, retry safety and suspended merchant hiding.

The PostgreSQL harness refuses anything except a local bayou_gifts_test database on port 55435. It uses generated fictional identities/products and removes only its own fixtures. Run it with DATABASE_URL and DIRECT_URL set to that dedicated disposable database, after applying this branch's schema there. Never point db push or this harness at the owner database.

Browser verification: USD 100 returned the USD 50 and USD 90 items; a temporary draft accepted two gifts in one action and immediately marked both already added. The temporary draft and its selections were removed after verification; existing owner registries/catalog were preserved. Screenshot evidence lives in the parent workspace outputs directory. No public deployment or merge is implied.
