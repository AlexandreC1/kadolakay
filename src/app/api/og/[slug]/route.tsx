import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const registry = await db.registry.findUnique({
    where: { slug },
    select: {
      title: true,
      type: true,
      eventDate: true,
      user: { select: { name: true } },
    },
  });

  if (!registry) {
    return new Response("Not found", { status: 404 });
  }

  const typeEmoji: Record<string, string> = {
    BABY_SHOWER: "👶",
    WEDDING: "💍",
    BIRTHDAY: "🎂",
  };

  const typeLabel: Record<string, string> = {
    BABY_SHOWER: "Fèt Ti Bebe",
    WEDDING: "Maryaj",
    BIRTHDAY: "Fèt Anivesè",
  };

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 700, color: "#ffffff" }}>
            Kado
          </span>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>
            Lakay
          </span>
        </div>

        {/* Type badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: "9999px",
            padding: "8px 20px",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: 24 }}>
            {typeEmoji[registry.type] || "🎁"}
          </span>
          <span style={{ fontSize: 18, color: "#e2e8f0" }}>
            {typeLabel[registry.type] || registry.type}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "900px",
          }}
        >
          {registry.title}
        </div>

        {/* Date / User */}
        {(registry.eventDate || registry.user?.name) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "20px",
              fontSize: 20,
              color: "#93c5fd",
            }}
          >
            {registry.user?.name && <span>{registry.user.name}</span>}
            {registry.eventDate && (
              <span>
                {new Date(registry.eventDate).toLocaleDateString("fr-HT", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#f59e0b",
            color: "#1e3a5f",
            padding: "14px 36px",
            borderRadius: "12px",
            fontSize: 22,
            fontWeight: 600,
            marginTop: "36px",
          }}
        >
          Wè rejis la →
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
