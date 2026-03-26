"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { registerBusiness } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const departments = [
  "Artibonite",
  "Centre",
  "Grand'Anse",
  "Nippes",
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Est",
];

export function BusinessSignupForm() {
  const t = useTranslations();
  const [pending, setPending] = useState(false);

  const categories = [
    { value: "furniture", label: t("business.categories.furniture") },
    { value: "electronics", label: t("business.categories.electronics") },
    { value: "clothing", label: t("business.categories.clothing") },
    { value: "jewelry", label: t("business.categories.jewelry") },
    { value: "food", label: t("business.categories.food") },
    { value: "beauty", label: t("business.categories.beauty") },
    { value: "home", label: t("business.categories.home") },
    { value: "baby", label: t("business.categories.baby") },
    { value: "other", label: t("business.categories.other") },
  ];

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await registerBusiness(formData);
    } catch {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Business Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t("business.name")} *
        </label>
        <Input id="name" name="name" required />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          {t("business.category")} *
        </label>
        <select
          id="category"
          name="category"
          required
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">--</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          {t("business.description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.city")}
          </label>
          <Input id="city" name="city" />
        </div>
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.department")}
          </label>
          <select
            id="department"
            name="department"
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">--</option>
            {departments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.phone")}
          </label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.whatsapp")}
          </label>
          <Input id="whatsapp" name="whatsapp" type="tel" />
        </div>
      </div>

      {/* Payment */}
      <div className="border-t border-gray-200 pt-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {t("checkout.payWith")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="moncashNumber" className="block text-sm font-medium text-gray-700 mb-1">
              MonCash
            </label>
            <Input id="moncashNumber" name="moncashNumber" placeholder="+509..." />
          </div>
          <div>
            <label htmlFor="natcashNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Natcash
            </label>
            <Input id="natcashNumber" name="natcashNumber" placeholder="+509..." />
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? t("common.loading") : t("business.signup")}
      </Button>
    </form>
  );
}
