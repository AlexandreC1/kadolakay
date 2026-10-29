import { spawnSync } from "node:child_process";
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required for migrations"); process.exit(1); }
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
