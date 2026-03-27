"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createOrder } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

interface CheckoutItem {
  id: string;
  title: string;
  priceHTG: number | null;
  priceUSD: number | null;
  quantity: number;
  source: string;
  externalUrl: string | null;
  imageUrl: string | null;
  businessName: string | null;
}

interface CheckoutFormProps {
  registrySlug: string;
  items: CheckoutItem[];
  locale: string;
}

const paymentMethods = [
  {
    id: "stripe",
    name: "Credit / Debit Card",
    icon: "💳",
    currency: "USD",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: "🅿️",
    currency: "USD",
  },
  {
    id: "moncash",
    name: "MonCash",
    icon: "📱",
    currency: "HTG",
  },
  {
    id: "natcash",
    name: "Natcash",
    icon: "📲",
    currency: "HTG",
  },
];

export function CheckoutForm({ registrySlug, items, locale }: CheckoutFormProps) {
  const t = useTranslations();
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    Object.fromEntries(items.map((item) => [item.id, 1]))
  );
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHTG = paymentMethod === "moncash" || paymentMethod === "natcash";
  const preferred = isHTG ? "HTG" : "USD";

  // Calculate total
  const total = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id);
    if (!item) return sum;
    const price = isHTG
      ? (item.priceHTG || 0)
      : (item.priceUSD || 0);
    return sum + price * qty;
  }, 0);

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const selectedIds = Object.keys(selectedItems);
    if (selectedIds.length === 0) {
      setError("Please select at least one item");
      setPending(false);
      return;
    }

    formData.set("registryItemIds", JSON.stringify(selectedIds));
    formData.set("quantities", JSON.stringify(selectedItems));
    formData.set("paymentProvider", paymentMethod);

    try {
      const result = await createOrder(formData);

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Items selection */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {t("registry.items")}
        </h2>
        <div className="space-y-2">
          {items.map((item) => {
            const isSelected = !!selectedItems[item.id];
            const isExternal =
              item.source === "AMAZON" || item.source === "EXTERNAL";

            if (isExternal) return null; // External items don't go through checkout

            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {item.title}
                    </p>
                    {item.businessName && (
                      <p className="text-xs text-blue-600">
                        {item.businessName}
                      </p>
                    )}
                  </div>
                  <CurrencyDisplay
                    priceHTG={item.priceHTG}
                    priceUSD={item.priceUSD}
                    preferred={preferred}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Buyer info */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.buyerName")} *
          </label>
          <Input name="buyerName" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.buyerEmail")} *
          </label>
          <Input name="buyerEmail" type="email" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.buyerPhone")}
          </label>
          <Input name="buyerPhone" type="tel" />
        </div>
      </div>

      {/* Gift message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("checkout.giftMessage")}
        </label>
        <textarea
          name="giftMessage"
          rows={3}
          placeholder={t("checkout.giftMessagePlaceholder")}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Anonymous option */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="isAnonymous"
          value="true"
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <span className="text-sm text-gray-700">{t("checkout.anonymous")}</span>
      </label>

      {/* Payment method */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {t("checkout.payWith")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id)}
              className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                paymentMethod === method.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-lg">{method.icon}</span>
              <div className="text-left">
                <p>{method.name}</p>
                <p className="text-xs text-gray-400">{method.currency}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>{t("checkout.total")}</span>
          <span>
            {isHTG
              ? `${total.toLocaleString("fr-HT")} HTG`
              : `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="gold"
        size="xl"
        className="w-full"
        disabled={pending || Object.keys(selectedItems).length === 0}
      >
        {pending ? t("common.loading") : t("checkout.sendGift")}
      </Button>
    </form>
  );
}
