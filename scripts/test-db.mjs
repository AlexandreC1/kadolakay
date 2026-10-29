import { spawnSync } from "node:child_process";
try { process.loadEnvFile(".env"); } catch { /* CI provides environment directly. */ }
const url = new URL(process.env.DATABASE_URL || "postgresql://localhost/missing");
if (!["localhost", "127.0.0.1"].includes(url.hostname) && process.env.ALLOW_TEST_DATABASE !== "1") {
  console.error("Database tests require a local or explicitly designated test database. Never use production."); process.exit(1);
}
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/services/checkout.integration.test.ts", "src/services/registry.integration.test.ts", "src/services/catalog.integration.test.ts", "src/services/onboarding.integration.test.ts"], { stdio: "inherit", env: { ...process.env, RUN_DB_TESTS: "1" } });
process.exit(result.status ?? 1);
