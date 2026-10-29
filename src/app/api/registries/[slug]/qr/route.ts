import { z } from "zod";
import { entitySlugSchema } from "@/lib/validators/entity-id";
import { createPublicRegistryQr } from "@/services/registry-qr";

export const runtime = "nodejs";
const querySchema = z.strictObject({ locale: z.enum(["ht", "fr", "en"]).default("ht") });
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const search = new URL(request.url).searchParams;
  const query = querySchema.safeParse(Object.fromEntries(search));
  if (!entitySlugSchema.safeParse(slug).success || !query.success || [...search.keys()].length !== new Set(search.keys()).size) return Response.json({ error: "INVALID_QR_REQUEST" }, { status: 400, headers });
  const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
  if (!base) return Response.json({ error: "QR_UNAVAILABLE" }, { status: 503, headers });
  try {
    const image = await createPublicRegistryQr(slug, query.data.locale, base);
    if (!image) return Response.json({ error: "REGISTRY_UNAVAILABLE" }, { status: 404, headers });
    return new Response(new Uint8Array(image), { headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": `inline; filename="bayou-${slug}-registry-card.png"` } });
  } catch { return Response.json({ error: "QR_UNAVAILABLE" }, { status: 503, headers }); }
}
