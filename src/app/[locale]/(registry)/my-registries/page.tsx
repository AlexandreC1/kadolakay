import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pageHref, parsePageRequest } from "@/lib/pagination";
import { getMyRegistriesPage } from "@/lib/queries/registries";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const typeEmoji: Record<string, string> = {
  BABY_SHOWER: "👶",
  WEDDING: "💍",
  BIRTHDAY: "🎂",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export default async function MyRegistriesPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/my-registries");
  }

  const t = await getTranslations();
  const { cursor } = await searchParams;
  const { items: registries, nextCursor } = await getMyRegistriesPage(
    session.user.id,
    parsePageRequest({ cursor, take: 20 }),
  );
  const nextHref = pageHref("/my-registries", {}, nextCursor);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("nav.myRegistries")}
        </h1>
        <Link href="/create">
          <Button variant="gold">{t("registry.create")}</Button>
        </Link>
      </div>

      {registries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500 mb-4">{t("registry.noItems")}</p>
          <Link href="/create">
            <Button variant="gold" size="lg">
              {t("registry.create")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {registries.map((registry) => {
            const fulfilled = registry.fulfilledItems;
            const total = registry.totalItems;

            return (
              <Link key={registry.id} href={`/r/${registry.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">
                          {typeEmoji[registry.type] || "🎁"}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {registry.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[registry.status]}`}
                            >
                              {t(`registry.${registry.status.toLowerCase()}`)}
                            </span>
                            {total > 0 && (
                              <span className="text-xs text-gray-400">
                                {fulfilled}/{total} {t("registry.fulfilled")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {registry.eventDate && (
                        <span className="text-sm text-gray-500 shrink-0">
                          {new Date(registry.eventDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {nextHref && (
            <div className="pt-2 text-center">
              <Link href={nextHref} className="text-sm font-medium text-amber-700 hover:underline">
                {t("common.next")} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
