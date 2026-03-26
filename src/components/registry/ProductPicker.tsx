"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

interface BusinessProduct {
  id: string;
  name: string;
  description: string | null;
  priceHTG: number | null;
  priceUSD: number | null;
  imageUrl: string | null;
  businessId: string;
  businessName: string;
}

interface ProductPickerProps {
  registryId: string;
  onAdd: (product: BusinessProduct) => void;
  onClose: () => void;
}

export function ProductPicker({ registryId, onAdd, onClose }: ProductPickerProps) {
  const t = useTranslations();
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products/browse");
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch {
        // error handled
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("landing.featureLocal")}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <Input
            placeholder={t("common.search") + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Pa gen pwodwi ki koresponn.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((product) => (
                <Card key={product.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        📦
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-blue-600">{product.businessName}</p>
                      <CurrencyDisplay
                        priceHTG={product.priceHTG}
                        priceUSD={product.priceUSD}
                        className="text-sm"
                      />
                    </div>
                    <Button size="sm" onClick={() => onAdd(product)}>
                      {t("registry.addItem")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
