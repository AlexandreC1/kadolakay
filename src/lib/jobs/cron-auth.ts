import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fail closed when the
 * secret is unset or short, compare in constant time.
 */
export function isAuthorizedCron(req: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.length < 32) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
