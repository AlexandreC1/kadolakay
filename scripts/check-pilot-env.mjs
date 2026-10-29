try { process.loadEnvFile(".env"); } catch { /* Host provides secrets. */ }
const required = ["DATABASE_URL", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
if (process.env.CHECKOUT_ENABLED === "true" || process.env.RECONCILIATION_ENABLED === "true") required.push("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "CRON_SECRET");
const problems = required.filter(name => !process.env[name]?.trim()).map(name => `${name}: missing`);
for (const name of ["AUTH_SECRET", ...(required.includes("CRON_SECRET") ? ["CRON_SECRET"] : [])]) if (process.env[name] && process.env[name].length < 32) problems.push(`${name}: use at least 32 characters`);
for (const name of ["NEXT_PUBLIC_APP_URL", "UPSTASH_REDIS_REST_URL"]) {
  try { const url = new URL(process.env[name]); if (url.protocol !== "https:" || url.username || url.password || ["localhost", "127.0.0.1"].includes(url.hostname)) problems.push(`${name}: hosted HTTPS origin required`); } catch { problems.push(`${name}: invalid URL`); }
}
if (process.env.CHECKOUT_ENABLED === "true") console.log("New purchases enabled: business eligibility, inventory, fulfillment, refunds, and live provider evidence still require release review.");
if (problems.length) { console.error("Hosted pilot not configured:\n" + [...new Set(problems)].map(value => `- ${value}`).join("\n")); process.exitCode = 1; }
else console.log("Core configuration is present. OAuth, limiter, payment, storage, backup, quota and hosted browser verification are still required.");
