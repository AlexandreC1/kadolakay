import { spawnSync } from "node:child_process";
try { process.loadEnvFile(".env"); } catch { /* CI provides environment directly. */ }
const url = new URL(process.env.DATABASE_URL || "postgresql://localhost/missing");
const localTest = ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.endsWith("_test");
if (!localTest && process.env.ALLOW_TEST_DATABASE !== "1") {
  console.error("Database tests require a disposable database ending in _test, or an explicitly designated test database. Never use production or the local app database."); process.exit(1);
}
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/services/checkout.integration.test.ts", "src/services/registry.integration.test.ts", "src/services/catalog.integration.test.ts", "src/services/onboarding.integration.test.ts", "src/services/business-review.integration.test.ts", "src/services/sessions.integration.test.ts", "src/services/product-foundations.integration.test.ts"], { stdio: "inherit", env: { ...process.env, RUN_DB_TESTS: "1" } });
process.exit(result.status ?? 1);
