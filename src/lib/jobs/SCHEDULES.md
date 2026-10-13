# Cron schedules

`vercel.json` cannot hold comments and is static (no env interpolation), so the
schedule lives here.

**Vercel Hobby allows at most one run per day per cron** (and fires anywhere in
the scheduled hour). A deploy with a more frequent expression fails with
"Deployment failed" → https://vercel.com/docs/cron-jobs/usage-and-pricing.
So `vercel.json` ships daily schedules (06:xx UTC = 02:xx ET, staggered).

Emails do NOT wait for the daily cron: `scheduleDrain()` (src/lib/email/outbox.ts)
drains the outbox right after the response via `after()`; the cron is only the
safety net for retries.

## On Vercel Pro (or an external scheduler hitting the routes with `Authorization: Bearer $CRON_SECRET`)

| Route | Pro schedule |
|---|---|
| /api/cron/send-emails | `* * * * *` |
| /api/cron/reconcile-payments | `*/10 * * * *` |
| /api/cron/expire-orders | `*/15 * * * *` |
| /api/cron/cleanup | `17 4 * * *` |

Switch by editing `vercel.json` (or set `CRON_PLAN=pro` as a reminder flag in
the project env; it is informational only). Free alternative: an external
scheduler such as cron-job.org or a GitHub Actions `schedule:` workflow calling
the routes with the bearer header.
