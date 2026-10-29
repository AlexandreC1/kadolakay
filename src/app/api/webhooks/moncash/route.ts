import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "MonCash is not enabled for this release." }, { status: 503 });
}
