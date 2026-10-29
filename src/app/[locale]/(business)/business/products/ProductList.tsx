"use client";

import { useSafeMutation, MutationFeedback } from "@/components/shared/useSafeMutation";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { catalogCopy } from "@/lib/catalog-copy";
import { inventoryCopy } from "@/lib/inventory-copy";
import { EditProductForm } from "@/components/business/EditProductForm";
import { Package } from "lucide-react";
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
  stockQuantity: number | null;
  reservedStock: number;
  category: string | null;
}

interface ProductListProps {
  businessId: string;
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  const t = useTranslations();
  const locale = useLocale();
  const copy = catalogCopy(locale);
  const stock = inventoryCopy(locale);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { pending, status, run } = useSafeMutation();

  async function handleAdd(formData: FormData) {
    if (await run(() => addProduct(formData))) setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <MutationFeedback status={status} />
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
                  className="flex w-full rounded-lg border border-gray-300 bg-[var(--brand-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div>
                <label htmlFor="new-product-quantity" className="mb-1 block text-sm font-medium">{stock.quantity} *</label>
                <Input id="new-product-quantity" name="stockQuantity" type="number" min="0" max="1000000" step="1" required disabled={pending} aria-describedby="new-product-quantity-hint" />
                <p id="new-product-quantity-hint" className="mt-1 text-sm text-[var(--brand-muted)]">{stock.hint}</p>
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
          <Package className="mx-auto mb-2 h-9 w-9 text-slate-400" aria-hidden="true" />
          <p className="text-gray-500">{t("business.noProducts")}</p>
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
                      product.inStock && product.stockQuantity !== null && product.stockQuantity > product.reservedStock
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.stockQuantity === null ? stock.unknown : product.inStock && product.stockQuantity > product.reservedStock ? copy.inStock : copy.outOfStock}
                  </span>
                </div>
                <div className="mt-2">
                  <CurrencyDisplay
                    priceHTG={product.priceHTG}
                    priceUSD={product.priceUSD}
                    className="text-sm"
                  />
                </div>
                <div className="mt-3 text-sm text-[var(--brand-muted)]">
                  {product.stockQuantity === null ? <p>{stock.unknown}</p> : <><p>{stock.units}: {product.stockQuantity}</p><p>{stock.held}: {product.reservedStock}</p><p>{stock.available}: {product.inStock ? product.stockQuantity - product.reservedStock : 0}</p></>}
                </div>
                {product.reservedStock > 0 && <p role="status" className="mt-2 text-sm text-[var(--brand-muted)]">{stock.locked}</p>}
                <Button type="button" disabled={product.reservedStock > 0} className="mt-4 rounded-full" variant="outline" onClick={() => setEditingId(editingId === product.id ? null : product.id)}>{copy.edit}</Button>
                {editingId === product.id && <EditProductForm product={product} onClose={() => setEditingId(null)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
