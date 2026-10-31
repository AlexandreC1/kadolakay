import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BUSINESS_STATUS_COLORS } from "@/lib/constants";
import { Package, Receipt } from "lucide-react";

export default async function BusinessDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/business/dashboard");
  }

  const business = await db.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!business) {
    redirect("/business/signup");
  }

  const t = await getTranslations();

  // Count orders for this business's products
  const orderCount = await db.orderItem.count({
    where: {
      registryItem: { businessId: business.id },
      order: { status: { in: ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"] } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BUSINESS_STATUS_COLORS[business.status]}`}
            >
              {t(`business.${business.status === "PENDING_REVIEW" ? "pendingReview" : business.status === "APPROVED" ? "approved" : "suspended"}`)}
            </span>
            <span className="text-sm text-gray-500">{business.category}</span>
            {business.city && (
              <span className="text-sm text-gray-500">
                - {business.city}
              </span>
            )}
          </div>
        </div>
      </div>

      {business.status === "PENDING_REVIEW" && (
        <div className="mb-8 rounded-xl border border-gold-400/25 bg-gold-400/10 p-4">
          <p className="text-sm text-gold-300">
            {t("business.pendingMessage")}{" "}
            {t("business.pendingHint")}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("business.products")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              {business._count.products}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("nav.orders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${BUSINESS_STATUS_COLORS[business.status]}`}
            >
              {business.status.replace("_", " ")}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/business/products">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15"><Package className="h-6 w-6 text-brand-300" aria-hidden="true" /></span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t("business.products")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("business.addProduct")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/business/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15"><Receipt className="h-6 w-6 text-brand-300" aria-hidden="true" /></span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t("nav.orders")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("orders.viewOrders")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
