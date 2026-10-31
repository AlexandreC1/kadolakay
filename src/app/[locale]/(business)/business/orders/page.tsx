import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DEFAULT_BADGE_COLOR, ORDER_STATUS_COLORS } from "@/lib/constants";
import { Receipt } from "lucide-react";

export default async function BusinessOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const business = await db.business.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!business) {
    redirect("/business/signup");
  }

  const t = await getTranslations();

  // Get orders that include this business's products
  const orderItems = await db.orderItem.findMany({
    where: {
      registryItem: { businessId: business.id },
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          giftMessage: true,
          isAnonymous: true,
          status: true,
          createdAt: true,
        },
      },
      registryItem: {
        select: { title: true },
      },
    },
    orderBy: { order: { createdAt: "desc" } },
  });

  // Group by order
  const ordersMap = new Map<
    string,
    {
      order: (typeof orderItems)[0]["order"];
      items: Array<{
        title: string;
        quantity: number;
        priceHTG: number | null;
        priceUSD: number | null;
      }>;
    }
  >();

  for (const oi of orderItems) {
    const existing = ordersMap.get(oi.order.id);
    const item = {
      title: oi.registryItem.title,
      quantity: oi.quantity,
      priceHTG: oi.priceHTG ? Number(oi.priceHTG) : null,
      priceUSD: oi.priceUSD ? Number(oi.priceUSD) : null,
    };

    if (existing) {
      existing.items.push(item);
    } else {
      ordersMap.set(oi.order.id, { order: oi.order, items: [item] });
    }
  }

  const orders = Array.from(ordersMap.values());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {t("nav.orders")}
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Receipt className="mx-auto mb-2 h-12 w-12 text-gray-400" aria-hidden="true" />
          <p>{t("business.noOrders")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(({ order, items }) => (
            <Card key={order.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? DEFAULT_BADGE_COLOR}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.isAnonymous
                        ? t("orders.anonymous")
                        : order.buyerName}
                      {" | "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    {!order.isAnonymous && order.buyerPhone && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Tel: {order.buyerPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.title} x{item.quantity}
                      </span>
                      <CurrencyDisplay
                        priceHTG={item.priceHTG}
                        priceUSD={item.priceUSD}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>

                {order.giftMessage && (
                  <div className="mt-3 p-3 bg-gold-50 rounded-lg border border-gold-100">
                    <p className="text-xs text-gold-600 font-medium mb-1">
                      {t("checkout.giftMessage")}:
                    </p>
                    <p className="text-sm text-gray-700 italic">
                      &ldquo;{order.giftMessage}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
