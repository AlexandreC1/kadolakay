"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createRegistry } from "@/actions/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RegistryTypeIcon } from "@/components/shared/RegistryTypeIcon";

const registryTypes = [
  { value: "BABY_SHOWER" },
  { value: "WEDDING" },
  { value: "BIRTHDAY" },
] as const;

export function CreateRegistryForm() {
  const t = useTranslations();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const typeLabels: Record<string, string> = {
    BABY_SHOWER: t("registry.babyShower"),
    WEDDING: t("registry.wedding"),
    BIRTHDAY: t("registry.birthday"),
  };

  async function handleSubmit(formData: FormData) {
    if (!selectedType) return;
    setPending(true);
    formData.set("type", selectedType);
    try {
      await createRegistry(formData);
    } catch {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Type selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t("registry.registryTypes")}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {registryTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelectedType(type.value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                selectedType === type.value
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <RegistryTypeIcon type={type.value} className="h-8 w-8 text-brand-700" />
              <span className="text-sm font-medium text-gray-700">
                {typeLabels[type.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <>
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("registry.title")}
            </label>
            <Input
              id="title"
              name="title"
              required
              placeholder={
                selectedType === "WEDDING"
                  ? "Maryaj Marie & Jean"
                  : selectedType === "BABY_SHOWER"
                    ? "Fèt Ti Bebe Marie"
                    : "Fèt Anivesè Jean"
              }
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("registry.description")}
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Event date */}
          <div>
            <label
              htmlFor="eventDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("registry.eventDate")}
            </label>
            <Input id="eventDate" name="eventDate" type="date" />
          </div>

          {/* Amazon wishlist */}
          <div>
            <label
              htmlFor="amazonWishlistUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("registry.amazonWishlist")} ({t("common.or")} URL)
            </label>
            <Input
              id="amazonWishlistUrl"
              name="amazonWishlistUrl"
              type="url"
              placeholder="https://www.amazon.com/hz/wishlist/..."
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? t("common.loading") : t("registry.create")}
          </Button>
        </>
      )}
    </form>
  );
}
