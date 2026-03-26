import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { order: orderNumber } = await searchParams;
  const t = await getTranslations();

  const registry = await db.registry.findUnique({
    where: { slug },
    select: { title: true, slug: true, type: true },
  });

  // If we have an order number, fetch the order details
  const order = orderNumber
    ? await db.order.findUnique({
        where: { orderNumber },
        include: {
          items: {
            include: {
              registryItem: { select: { title: true } },
            },
          },
          payment: { select: { provider: true, currency: true } },
        },
      })
    : null;

  const registryTypeEmoji: Record<string, string> = {
    BABY_SHOWER: "👶",
    WEDDING: "💍",
    BIRTHDAY: "🎂",
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 text-center">
      <div className="text-6xl mb-6">
        {registryTypeEmoji[registry?.type || ""] || "🎁"}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t("checkout.thankYou")}
      </h1>

      {order && (
        <Card className="mt-8 text-left">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                {t("checkout.orderNumber")}
              </span>
              <span className="font-mono font-medium text-gray-900">
                {order.orderNumber}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              {order.items.map((oi) => (
                <div key={oi.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {oi.registryItem.title}
                    {oi.quantity > 1 && (
                      <span className="text-gray-400"> x{oi.quantity}</span>
                    )}
                  </span>
                  <span className="text-gray-500">
                    {oi.priceUSD
                      ? `$${Number(oi.priceUSD).toFixed(2)}`
                      : oi.priceHTG
                        ? `G${Number(oi.priceHTG).toFixed(2)}`
                        : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-semibold">
              <span>{t("checkout.total")}</span>
              <span>
                {order.payment?.currency === "HTG"
                  ? `G${Number(order.totalHTG || 0).toFixed(2)}`
                  : `$${Number(order.totalUSD || 0).toFixed(2)}`}
              </span>
            </div>

            {order.giftMessage && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-600 font-medium mb-1">
                  {t("checkout.giftMessage")}
                </p>
                <p className="text-sm text-gray-700 italic">
                  &ldquo;{order.giftMessage}&rdquo;
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={`/r/${slug}`}>
          <Button variant="gold">
            {t("registry.viewRegistry")}
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">
            {t("nav.home")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
