import { NextResponse } from "next/server";
import { requireActor } from "@/services/authorization";
import { exportAccountData } from "@/services/account-data";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/** Download a copy of the signed-in person's own data. Identity comes only from the session. */
export async function GET() {
  let actorId: string;
  try {
    actorId = (await requireActor("account:export")).id;
  } catch {
    return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401, headers: noStore });
  }
  if (!(await checkRateLimit("auth", `account-export:${actorId}`)).ok)
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { ...noStore, "Retry-After": "60" } });
  try {
    const data = await exportAccountData(actorId);
    const day = data.exportedAt.slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        ...noStore,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="bayou-data-${day}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "EXPORT_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}
