# Payment concurrency check

This check uses a disposable local PostgreSQL database and fictional data. It does not contact payment providers or use real payment accounts. It verifies fulfillment after a simulated verified payment, rather than the full provider or checkout flow.

With Docker running and project dependencies installed, use PowerShell:

```powershell
docker run --rm -d --name kdom-concurrency-check -e POSTGRES_USER=kdomtest -e POSTGRES_PASSWORD=kdomtest -e POSTGRES_DB=kdom_concurrency_test -p 127.0.0.1:55438:5432 postgres:16-alpine
$env:DATABASE_URL = 'postgresql://kdomtest:kdomtest@127.0.0.1:55438/kdom_concurrency_test'
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma migrate deploy
npx tsx scripts/verify-payment-concurrency.ts
docker stop kdom-concurrency-check
```

The script refuses other database hosts, ports and database names. Wait until PostgreSQL is accepting connections before applying migrations. The container is removed when stopped; do not attach a persistent volume. Use a dedicated shell so the temporary database environment variables do not affect other work.

The test checks simultaneous duplicate payment deliveries, two competing paid orders for one item, a rejected amount mismatch, notification deduplication and the late-payment refund state. It does not test actual refunds, merchant payouts, checkout reservation races, provider webhooks or production capacity. Those remain launch requirements.
