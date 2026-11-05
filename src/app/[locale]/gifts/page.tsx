import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { GiftFinder } from "@/components/registry/GiftFinder";
export default async function GiftsPage({searchParams}: {searchParams: Promise<{q?: string | string[]}>}) {
  const query = (await searchParams).q;
  const initialSearch = typeof query === "string" ? query.trim().slice(0, 64) : "";
  const session = await auth();
  const t = await getTranslations("giftFinder");
  const registries = session?.user?.id
    ? await db.registry.findMany({
        where: { userId: session.user.id, status: { not: "ARCHIVED" } },
        select: { id: true, title: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      })
    : [];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 max-w-2xl space-y-3">
        <h1 className="text-4xl text-gray-900">{t("title")}</h1>
        <p className="text-gray-700">{t("intro")}</p>
      </header>
      <GiftFinder key={initialSearch} registries={registries} initialSearch={initialSearch} />
    </div>
  );
}
