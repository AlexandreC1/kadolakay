try { process.loadEnvFile(".env"); } catch { /* Deployment provides environment. */ }
const required = ["DATABASE_URL", "AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "CRON_SECRET", "NEXT_PUBLIC_APP_URL"];
const missing = required.filter(name => !process.env[name]?.trim());
const issues = [...missing.map(name => `${name}: missing`)];
for (const name of ["AUTH_SECRET", "CRON_SECRET"]) if (process.env[name] && process.env[name].length < 32) issues.push(`${name}: must contain at least 32 characters`);
try { const url = new URL(process.env.NEXT_PUBLIC_APP_URL); if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) issues.push("NEXT_PUBLIC_APP_URL: production HTTPS domain required"); } catch { issues.push("NEXT_PUBLIC_APP_URL: invalid URL"); }
if (process.env.CHECKOUT_ENABLED === "true") {
  if (!process.argv.includes("--staging")) issues.push("CHECKOUT_ENABLED: merchant-direct production settlement is not implemented; public checkout must stay disabled");
  if (process.env.PAYMENT_MODE !== "sandbox" || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) issues.push("PAYMENT_MODE: checkout verification requires sandbox mode and test credentials");
}
if (issues.length) { console.error("Release blocked:\n" + issues.map(issue => `- ${issue}`).join("\n")); process.exit(1); }
console.log("Required configuration is present. This does not replace live OAuth, payment, backup and browser acceptance tests.");
