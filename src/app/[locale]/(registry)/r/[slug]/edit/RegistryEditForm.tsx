"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  updateRegistry,
  publishRegistry,
  deleteRegistry,
} from "@/actions/registry";
import { addItemToRegistry, removeRegistryItem } from "@/actions/registry-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

interface RegistryEditFormProps {
  registry: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    eventDate: Date | null;
    status: string;
    amazonWishlistUrl: string | null;
    items: Array<{
      id: string;
      title: string;
      priceHTG: unknown;
      priceUSD: unknown;
      quantity: number;
      fulfilledQty: number;
      status: string;
      source: string;
      imageUrl: string | null;
      externalUrl: string | null;
    }>;
  };
}

export function RegistryEditForm({ registry }: RegistryEditFormProps) {
  const t = useTranslations();
  const [showAddItem, setShowAddItem] = useState(false);
  const [pending, setPending] = useState(false);

  async function handlePublish() {
    setPending(true);
    await publishRegistry(registry.id);
    setPending(false);
  }

  async function handleDelete() {
    if (confirm(t("registry.deleteRegistry") + "?")) {
      await deleteRegistry(registry.id);
    }
  }

  async function handleAddItem(formData: FormData) {
    setPending(true);
    await addItemToRegistry(registry.id, formData);
    setShowAddItem(false);
    setPending(false);
  }

  async function handleRemoveItem(itemId: string) {
    if (confirm(t("common.delete") + "?")) {
      await removeRegistryItem(itemId);
    }
  }

  return (
    <div className="space-y-8">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-3">
        {registry.status === "DRAFT" && (
          <Button variant="gold" onClick={handlePublish} disabled={pending}>
            {t("registry.publish")}
          </Button>
        )}
        {registry.status === "PUBLISHED" && (
          <a href={`/r/${registry.slug}`} target="_blank" rel="noopener">
            <Button variant="secondary">{t("registry.viewRegistry")}</Button>
          </a>
        )}
        <Button variant="destructive" onClick={handleDelete}>
          {t("registry.deleteRegistry")}
        </Button>
      </div>

      {/* Registry details form */}
      <Card>
        <CardContent className="p-6">
          <form
            action={async (formData: FormData) => {
              setPending(true);
              await updateRegistry(registry.id, formData);
              setPending(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("registry.title")}
              </label>
              <Input name="title" defaultValue={registry.title} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("registry.description")}
              </label>
              <textarea
                name="description"
                defaultValue={registry.description || ""}
                rows={3}
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("registry.eventDate")}
              </label>
              <Input
                name="eventDate"
                type="date"
                defaultValue={
                  registry.eventDate
                    ? new Date(registry.eventDate).toISOString().slice(0, 10)
                    : ""
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("registry.amazonWishlist")}
              </label>
              <Input
                name="amazonWishlistUrl"
                type="url"
                defaultValue={registry.amazonWishlistUrl || ""}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Items section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("registry.items")} ({registry.items.length})
          </h2>
          <Button onClick={() => setShowAddItem(!showAddItem)}>
            {showAddItem ? t("common.cancel") : t("registry.addItem")}
          </Button>
        </div>

        {/* Add item form */}
        {showAddItem && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <form action={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("item.title")} *
                  </label>
                  <Input name="title" required />
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
                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("item.quantity")}
                    </label>
                    <Input name="quantity" type="number" min="1" defaultValue="1" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("item.source")}
                  </label>
                  <select
                    name="source"
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="CUSTOM">{t("item.custom")}</option>
                    <option value="AMAZON">{t("item.fromAmazon")}</option>
                    <option value="EXTERNAL">{t("item.fromExternal")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("item.externalUrl")}
                  </label>
                  <Input name="externalUrl" type="url" placeholder="https://..." />
                </div>
                <Button type="submit" disabled={pending}>
                  {pending ? t("common.loading") : t("registry.addItem")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Items list */}
        {registry.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
            <p>{t("registry.noItems")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registry.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <CurrencyDisplay
                        priceHTG={item.priceHTG ? Number(item.priceHTG) : null}
                        priceUSD={item.priceUSD ? Number(item.priceUSD) : null}
                        className="text-sm"
                      />
                      <span className="text-xs text-gray-400">
                        x{item.quantity}
                      </span>
                      {item.externalUrl && (
                        <span className="text-xs text-blue-500">
                          {item.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {t("common.delete")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
