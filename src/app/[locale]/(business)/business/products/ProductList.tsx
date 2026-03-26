"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addProduct } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceHTG: number | null;
  priceUSD: number | null;
  imageUrl: string | null;
  inStock: boolean;
  category: string | null;
}

interface ProductListProps {
  businessId: string;
  products: Product[];
}

export function ProductList({ businessId, products }: ProductListProps) {
  const t = useTranslations();
  const [showAdd, setShowAdd] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleAdd(formData: FormData) {
    setPending(true);
    try {
      await addProduct(formData);
      setShowAdd(false);
    } catch {
      // error handled
    }
    setPending(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? t("common.cancel") : t("business.addProduct")}
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-5">
            <form action={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("item.title")} *
                </label>
                <Input name="name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("item.description")}
                </label>
                <textarea
                  name="description"
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("item.priceHTG")}
                  </label>
                  <Input name="priceHTG" type="number" step="0.01" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("item.priceUSD")}
                  </label>
                  <Input name="priceUSD" type="number" step="0.01" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("business.category")}
                </label>
                <Input name="category" />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? t("common.loading") : t("business.addProduct")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <span className="text-4xl block mb-2">📦</span>
          <p className="text-gray-500">Pa gen pwodwi ankò.</p>
          <Button
            variant="gold"
            className="mt-4"
            onClick={() => setShowAdd(true)}
          >
            {t("business.addProduct")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.imageUrl && (
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.inStock
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.inStock ? "An stòk" : "Pa disponib"}
                  </span>
                </div>
                <div className="mt-2">
                  <CurrencyDisplay
                    priceHTG={product.priceHTG}
                    priceUSD={product.priceUSD}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
