// Deliberately no public role-management endpoint or identity allowlist.
export {};
try { process.loadEnvFile(".env"); } catch { /* Operator may supply environment directly. */ }
const args = process.argv.slice(2);
if (args.length !== 3 || args[0] !== "--user-id" || !args[1] || args[2] !== "--confirm") {
  console.error("Usage: npm run admin:bootstrap -- --user-id USER_ID --confirm");
  process.exit(1);
}
if (!process.env.DATABASE_URL) { console.error("DATABASE_CONFIGURATION_REQUIRED"); process.exit(1); }
let databaseHost: string;
try { databaseHost = new URL(process.env.DATABASE_URL).hostname; }
catch { console.error("DATABASE_CONFIGURATION_INVALID"); process.exit(1); }
if (!["localhost", "127.0.0.1"].includes(databaseHost)) {
  console.error("LOCAL_BOOTSTRAP_ONLY: hosted privilege changes require a separate reviewed operator procedure.");
  process.exit(1);
}
const { bootstrapSuperadmin } = await import("./lib/bootstrap-superadmin");
const { db } = await import("../src/lib/db");
try {
  const result = await bootstrapSuperadmin(args[1]);
  console.log(JSON.stringify({ status: result.changed ? "SUPERADMIN_GRANTED" : "SUPERADMIN_ALREADY_GRANTED", role: result.role }));
} catch {
  console.error("SUPERADMIN_BOOTSTRAP_REFUSED: verify the exact existing account and owner initialization state.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }
