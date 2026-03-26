import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const t = await getTranslations();

  const [registryCount, orderCount] = await Promise.all([
    db.registry.count({ where: { userId: session.user.id } }),
    db.order.count({ where: { buyerId: session.user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("nav.dashboard")}
          </h1>
          <p className="text-gray-600 mt-1">
            Bonjou, {session.user.name || session.user.email}!
          </p>
        </div>
        <Link href="/create">
          <Button variant="gold">{t("registry.create")}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("nav.myRegistries")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{registryCount}</p>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/my-registries">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <span className="text-3xl">🎁</span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t("nav.myRegistries")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("registry.viewRegistry")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <span className="text-3xl">📦</span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t("nav.orders")}
                </h3>
                <p className="text-sm text-gray-500">
                  Wè kado moun achte pou ou
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/business/signup">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <span className="text-3xl">🏪</span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t("business.signup")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("business.signupDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
