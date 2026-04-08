/**
 * Liveness + readiness probe.
 *
 * - GET /api/health → 200 with build SHA, uptime, and DB ping result.
 * - Returns 503 if the database is unreachable so external uptime monitors
 *   (BetterStack, Cronitor, UptimeRobot…) can page us before users notice.
 *
 * No auth — must be reachable from anywhere. Be careful not to leak details.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk ? "up" : "down",
    sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    latencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
