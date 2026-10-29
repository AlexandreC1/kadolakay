import { defineConfig } from "prisma/config";
try { process.loadEnvFile(".env"); } catch { /* Hosted/CI environments provide configuration. */ }
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Generation does not connect to a database and must work on a fresh build.
  // Migration commands still require a real URL and fail when none is supplied.
  datasource: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL },
});
