import { PrismaClient, type Prisma } from "@prisma/client";
import { log } from "@/lib/log";

/**
 * Prisma client.
 *
 * Connection pooling (WS7): in production DATABASE_URL must be the Neon
 * *pooled* URL (host contains `-pooler`, query `?pgbouncer=true&connection_limit=1&pool_timeout=15`).
 * Serverless functions each open their own client; without the pooler a
 * traffic spike exhausts Postgres connections. Migrations use DIRECT_URL
 * (unpooled) via `directUrl` in schema.prisma.
 */
export const SLOW_QUERY_MS = 500;

export function poolingWarnings(url: string | undefined): string[] {
  if (!url) return ["DATABASE_URL is not set"];
  const warnings: string[] = [];
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return ["DATABASE_URL is not a valid URL"];
  }
  if (u.hostname.endsWith(".neon.tech")) {
    if (!u.hostname.includes("-pooler")) warnings.push("Neon DATABASE_URL is not the -pooler host");
    if (u.searchParams.get("pgbouncer") !== "true") warnings.push("DATABASE_URL is missing pgbouncer=true");
    if (!u.searchParams.get("connection_limit")) warnings.push("DATABASE_URL is missing connection_limit (use 1 on serverless)");
  }
  return warnings;
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "error" },
    ],
  });
  // Slow-query logging: only the statement shape and duration (params may hold PII).
  (client as unknown as { $on(e: "query", cb: (ev: Prisma.QueryEvent) => void): void }).$on("query", (ev) => {
    if (ev.duration >= SLOW_QUERY_MS) {
      log.warn("db.slow_query", { durationMs: ev.duration, query: ev.query.slice(0, 500) });
    }
  });
  if (process.env.NODE_ENV === "production") {
    for (const w of poolingWarnings(process.env.DATABASE_URL)) log.warn("db.pooling", { warning: w });
  }
  return client;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
