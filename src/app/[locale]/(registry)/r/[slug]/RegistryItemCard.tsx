"use client";

import { useTranslations } from "next-intl";
import { safeHref } from "@/lib/url";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { Gift } from "lucide-react";

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
    if (isExternal) {
      // Only ever open http(s) links, in a new context with no opener (review H1).
      const href = safeHref(item.externalUrl);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    } else {
      // Navigate to checkout with this item selected
      window.location.href = `${window.location.pathname}/checkout?items=${item.id}`;
    }
  }

  return (
    <Card
      className={`group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-brand-500/40 ${isFulfilled ? "opacity-50" : ""}`}
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Gift className="h-12 w-12 text-gray-300" strokeWidth={1.25} aria-hidden="true" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>

        {item.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {item.description}
          </p>
        )}

        {item.business && (
          <p className="mt-1 text-xs text-brand-300">{item.business.name}</p>
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
            <span className="inline-block w-full text-center text-sm text-green-300 font-medium py-2">
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
