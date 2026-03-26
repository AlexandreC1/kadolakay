"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

interface RegistryItemCardProps {
  item: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    priceHTG: unknown;
    priceUSD: unknown;
    quantity: number;
    fulfilledQty: number;
    status: string;
    source: string;
    externalUrl: string | null;
    business: { name: string; slug: string } | null;
  };
  locale: string;
}

export function RegistryItemCard({ item, locale }: RegistryItemCardProps) {
  const t = useTranslations();
  const remaining = item.quantity - item.fulfilledQty;
  const isFulfilled = item.status === "FULFILLED";
  const isExternal = item.source === "AMAZON" || item.source === "EXTERNAL";

  function handleBuy() {
    if (isExternal && item.externalUrl) {
      window.open(item.externalUrl, "_blank");
    } else {
      // Navigate to checkout — for now, show the item
      window.location.href = `?buy=${item.id}`;
    }
  }

  return (
    <Card
      className={`overflow-hidden transition-opacity ${isFulfilled ? "opacity-50" : ""}`}
    >
      {item.imageUrl && (
        <div className="aspect-square bg-gray-100 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>

        {item.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {item.description}
          </p>
        )}

        {item.business && (
          <p className="mt-1 text-xs text-blue-600">{item.business.name}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <CurrencyDisplay
            priceHTG={item.priceHTG ? Number(item.priceHTG) : null}
            priceUSD={item.priceUSD ? Number(item.priceUSD) : null}
            preferred={locale === "ht" ? "HTG" : "USD"}
          />

          {item.quantity > 1 && (
            <span className="text-xs text-gray-400">
              {remaining}/{item.quantity} {t("registry.available")}
            </span>
          )}
        </div>

        <div className="mt-3">
          {isFulfilled ? (
            <span className="inline-block w-full text-center text-sm text-green-600 font-medium py-2">
              {t("registry.fulfilled")}
            </span>
          ) : (
            <Button
              variant={isExternal ? "outline" : "default"}
              size="sm"
              className="w-full"
              onClick={handleBuy}
            >
              {isExternal ? (
                <>
                  {t("checkout.buyGift")}
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </>
              ) : (
                t("checkout.buyGift")
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
