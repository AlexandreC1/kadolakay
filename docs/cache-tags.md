# Cache tags (WS7)

| Tag | What is cached | Who must `revalidateTag()` it |
|---|---|---|
| `browse` | `/browse` business list (`getBrowseBusinesses`, 5 min TTL) | WS3 `business.ts` (register/update, product add/update/delete), WS5 admin business approve/suspend |
| `registry:<slug>` | Public registry page data (to adopt in WS3 `getRegistryBySlug` for **public, published** registries only — never cache private/share-token reads) | WS1 fulfil (`fulfillOrder`), WS3 registry/item mutations, WS5 refunds |

HTTP caching:
- `GET /api/products/browse` returns `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- Pages that read the session (orders, my-registries, dashboard) are always dynamic, never cached.

Until the owning workstreams add `revalidateTag("browse")`, approval and product changes take up to 5 minutes to show on /browse.
