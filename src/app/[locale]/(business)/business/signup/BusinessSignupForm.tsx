"use client";

import { useSafeMutation } from "@/components/shared/useSafeMutation";


import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { businessFormErrors, type BusinessFormError, type BusinessFormField } from "@/lib/business-form-validation";
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
  const { pending, run } = useSafeMutation();
  const [errors, setErrors] = useState<BusinessFormError[]>([]);
  const [serverError, setServerError] = useState(false);
  const [errorAttempt, setErrorAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (!errorAttempt) return;
    summary.current?.focus({ preventScroll: true });
    summary.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [errorAttempt]);
  const fieldLabel = (field: BusinessFormField | null) => field === "moncashNumber" ? "MonCash" : field === "natcashNumber" ? "Natcash" : field ? t(`business.${field}`) : "";
  const message = (error: BusinessFormError) => error.code === "fieldInvalid" ? t("business.fieldInvalid", { field: fieldLabel(error.field) }) : t(`business.${error.code}`);
  const invalidProps = (field: BusinessFormField) => ({ "aria-invalid": errors.some(error => error.field === field) || undefined, "aria-describedby": errors.some(error => error.field === field) ? `business-${field}-error` : undefined });
  const inlineError = (field: BusinessFormField) => { const error = errors.find(error => error.field === field); return error ? <p id={`business-${field}-error`} className="mt-2 text-sm text-[var(--brand-error)]">{message(error)}</p> : null; };

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
    if (submitting.current) return;
    const issues = businessFormErrors(Object.fromEntries(formData));
    setErrors(issues); setServerError(false);
    if (issues.length) { setErrorAttempt(value => value + 1); return; }
    submitting.current = true;
    try {
      if (!await run(() => registerBusiness(formData))) { setServerError(true); setErrorAttempt(value => value + 1); }
    } finally { submitting.current = false; }
  }

  return (
    <form ref={form} noValidate onSubmit={event => { event.preventDefault(); void handleSubmit(new FormData(event.currentTarget)); }} onBlur={() => { if (errorAttempt && form.current) setErrors(businessFormErrors(Object.fromEntries(new FormData(form.current)))); }} className="space-y-5 [&_input]:scroll-mt-28 [&_select]:scroll-mt-28 [&_textarea]:scroll-mt-28 [&_[aria-invalid=true]]:border-[var(--brand-error)]">
      <p className="text-sm text-[var(--brand-secondary)]">{t("business.requiredHint")}</p>
      {(errors.length > 0 || serverError) && <div ref={summary} tabIndex={-1} role="alert" aria-labelledby="business-error-title" className="scroll-mt-28 rounded-xl border-2 border-[var(--brand-error)] bg-[var(--brand-error-surface)] p-5 text-[var(--brand-error)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
        <h2 id="business-error-title" className="text-lg font-semibold">{t("business.errorTitle")}</h2>
        <p className="mt-2 text-sm">{serverError ? t("common.saveFailed") : t("business.errorIntro")}</p>
        {errors.length > 0 && <ul className="mt-3 space-y-2">{errors.map(error => <li key={error.field || "form"}>{error.field ? <a href={`#${error.field}`} className="font-semibold underline underline-offset-4" onClick={event => { event.preventDefault(); const target = form.current?.elements.namedItem(error.field!); if (target instanceof HTMLElement) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "instant" }); } }}>{message(error)}</a> : <span>{t("common.saveFailed")}</span>}</li>)}</ul>}
      </div>}
      {/* Business Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t("business.name")} ({t("business.required")})
        </label>
        <Input id="name" name="name" required maxLength={100} {...invalidProps("name")} />
        {inlineError("name")}
      </div>

      <div>
        <label htmlFor="patenteNumber" className="block text-sm font-medium text-gray-700 mb-1">{t("business.patenteNumber")} <span className="text-[var(--brand-muted)]">({t("business.optional")})</span></label>
        <Input id="patenteNumber" name="patenteNumber" type="text" maxLength={100} autoComplete="off" spellCheck={false} disabled={pending} {...invalidProps("patenteNumber")} aria-describedby={`patente-hint${errors.some(error => error.field === "patenteNumber") ? " business-patenteNumber-error" : ""}`} />
        <p id="patente-hint" className="mt-2 text-xs leading-relaxed text-[var(--brand-muted)]">{t("business.patenteHint")}</p>
        {inlineError("patenteNumber")}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          {t("business.category")} ({t("business.required")})
        </label>
        <select
          id="category"
          name="category"
          required
          {...invalidProps("category")}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-[var(--brand-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">--</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {inlineError("category")}
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
          maxLength={2000}
          {...invalidProps("description")}
          className="flex w-full rounded-lg border border-gray-300 bg-[var(--brand-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {inlineError("description")}
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.city")}
          </label>
          <Input id="city" name="city" maxLength={200} {...invalidProps("city")} />
          {inlineError("city")}
        </div>
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.department")}
          </label>
          <select
            id="department"
            name="department"
            {...invalidProps("department")}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-[var(--brand-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">--</option>
            {departments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
          {inlineError("department")}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.phone")}
          </label>
          <Input id="phone" name="phone" type="tel" maxLength={200} {...invalidProps("phone")} />
          {inlineError("phone")}
        </div>
        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
            {t("business.whatsapp")}
          </label>
          <Input id="whatsapp" name="whatsapp" type="tel" maxLength={200} {...invalidProps("whatsapp")} />
          {inlineError("whatsapp")}
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
            <Input id="moncashNumber" name="moncashNumber" placeholder="+509..." maxLength={200} {...invalidProps("moncashNumber")} />
            {inlineError("moncashNumber")}
          </div>
          <div>
            <label htmlFor="natcashNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Natcash
            </label>
            <Input id="natcashNumber" name="natcashNumber" placeholder="+509..." maxLength={200} {...invalidProps("natcashNumber")} />
            {inlineError("natcashNumber")}
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="default"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? t("common.loading") : t("business.signup")}
      </Button>
    </form>
  );
}
