import { getTranslations } from "next-intl/server";
import { getApprovedBusinesses } from "@/actions/business";
import { Card, CardContent } from "@/components/ui/card";

export default async function BrowseBusinessesPage() {
  const t = await getTranslations("business");
  const businesses = await getApprovedBusinesses();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {t("browse")}
        </h1>
        <p className="mt-2 text-lg text-gray-600 max-w-2xl mx-auto">
          {t("browseDesc")}
        </p>
      </div>

      {businesses.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🏪</span>
          <p className="text-lg text-gray-500">
            Pa gen biznis ankò. Tounen byento!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <Card
              key={business.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              {business.coverUrl && (
                <div className="h-32 bg-gray-100 overflow-hidden">
                  <img
                    src={business.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700">
                      {business.name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {business.name}
                    </h3>
                    <p className="text-sm text-blue-600">{business.category}</p>
                    {business.city && (
                      <p className="text-xs text-gray-400">{business.city}</p>
                    )}
                  </div>
                </div>

                {business.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                    {business.description}
                  </p>
                )}

                {business.products.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">
                      {t("products")} ({business.products.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {business.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 overflow-hidden"
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                              {product.name.slice(0, 3)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
