import { RegistryIcon } from "@/components/shared/RegistryIcon";
/**
 * =============================================================================
 * Order Tracking Page - Registry Owner View
 * =============================================================================
 *
 * This page answers: "Who bought gifts from my registries?"
 *
 * IMPORTANT DISTINCTION:
 * - This page shows orders RECEIVED (gifts others bought for you)
 * - The dashboard "orders" count shows orders you PLACED (gifts you bought)
 *
 * For MVP, we show orders received since that's the more exciting view
 * for registry owners - seeing their gift list fill up.
 *
 * DATA FLOW:
 *   1. Auth check → get current user
 *   2. Find all registries owned by this user
 *   3. Find all orders containing items from those registries
 *   4. Display grouped by registry, sorted by date (newest first)
 * =============================================================================
 */

import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/orders");
  }

  const t = await getTranslations();

  // Find all orders that contain items from the user's registries
  const orders = await db.order.findMany({
    where: {
      status: "PAID",
      items: {
        some: {
          registryItem: {
            registry: {
              userId: session.user.id,
            },
          },
        },
      },
    },
    select: {
      id: true, orderNumber: true, buyerName: true, isAnonymous: true,
      giftMessage: true, status: true, createdAt: true,
      payment: { select: { currency: true, provider: true } },
      items: {
        where: { registryItem: { registry: { userId: session.user.id } } },
        select: {
          id: true, quantity: true, priceUSD: true, priceHTG: true,
          registryItem: {
            select: { title: true, registry: { select: { title: true, slug: true, type: true } } },
          },
        },
      },
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });


  const paymentStatusColors: Record<string, string> = {
    PAID: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("nav.orders")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("orders.subtitle")}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-[var(--brand-ocean)] hover:underline"
        >
          {t("common.back")} {t("nav.dashboard")}
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RegistryIcon className="mx-auto mb-4 h-12 w-12 text-[var(--brand-green)]" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {t("orders.noOrdersYet")}
            </h2>
            <p className="text-gray-500 mb-6">
              {t("orders.noOrdersDesc")}
            </p>
            <Link
              href="/my-registries"
              className={buttonVariants({ size: "lg" })}
            >
              {t("nav.myRegistries")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const registry = order.items[0]?.registryItem.registry;
            const localCurrency = order.payment?.currency === "HTG";
            const ownTotal = order.items.reduce((sum, item) => sum + Math.round(Number(localCurrency ? item.priceHTG ?? 0 : item.priceUSD ?? 0) * 100) * item.quantity, 0);
            const amount = (localCurrency ? "G" : "$") + (ownTotal / 100).toFixed(2);

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        <RegistryIcon type={registry?.type} />
                      </span>
                      <div>
                        <CardTitle className="text-lg">
                          {order.isAnonymous ? t("orders.anonymous") : order.buyerName}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          {registry?.title && (
                            <Link
                              href={`/r/${registry.slug}`}
                              className="text-[var(--brand-ocean)] hover:underline"
                            >
                              {registry.title}
                            </Link>
                          )}
                          {" · "}
                          {new Date(order.createdAt).toLocaleDateString("fr-HT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{amount}</span>
                      <span
                        className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          paymentStatusColors[order.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status === "PAID" ? t("orders.paid") : order.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Items purchased */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <ul className="space-y-1">
                      {order.items.map((oi) => (
                        <li
                          key={oi.id}
                          className="flex justify-between text-sm"
                        >
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
                                : "-"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gift message */}
                  {order.giftMessage && (
                    <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm text-amber-900 italic">
                        &ldquo;{order.giftMessage}&rdquo;
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        - {order.isAnonymous ? t("orders.anonymous") : order.buyerName}
                      </p>
                    </div>
                  )}

                  {/* Order number */}
                  <p className="text-xs text-gray-400 mt-3">
                    {t("checkout.orderNumber")}: {order.orderNumber}
                    {order.payment && (
                      <> · {order.payment.provider}</>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
