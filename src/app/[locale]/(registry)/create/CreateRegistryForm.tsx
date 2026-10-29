"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createRegistryDraft } from "@/actions/registry";
import { OccasionPicker } from "@/components/registry/OccasionPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onboardingCopy } from "@/lib/onboarding-copy";
import { isOccasion, occasionLabel, type Occasion } from "@/lib/occasions";
import { createRegistrySchema } from "@/lib/validators/registry";
import { registryCreateCopy, registryIssueFields, type RegistryCreateFailure } from "@/lib/registry-create-feedback";

export function CreateRegistryForm({ initialType }: { initialType?: string }) {
  const t = useTranslations(), locale = useLocale(), c = onboardingCopy(locale), feedbackCopy = registryCreateCopy(locale), router = useRouter();
  const [selectedType, setSelectedType] = useState<Occasion | null>(isOccasion(initialType) ? initialType : null);
  const [title, setTitle] = useState(""), [description, setDescription] = useState(""), [date, setDate] = useState(""), [storeLink, setStoreLink] = useState("");
  const [pending, setPending] = useState(false), [error, setError] = useState<RegistryCreateFailure | null>(null);
  const lock = useRef(false), summary = useRef<HTMLDivElement>(null), storeDetails = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!error) return;
    if (error.fields.includes("amazonWishlistUrl") && storeDetails.current) storeDetails.current.open = true;
    summary.current?.focus({ preventScroll: true });
    summary.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [error]);
  function selectOccasion(type: Occasion) { setSelectedType(type); setError(null); router.replace(`/${locale}/create?type=${type}`, { scroll: false }); }
  function invalid(field: string) { return error?.fields.some(value => value === field) || undefined; }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedType || lock.current) return;
    const form = new FormData(event.currentTarget);
    form.set("type", selectedType); form.set("locale", locale);
    const parsed = createRegistrySchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) { setError({ ok: false, code: "INVALID_DETAILS", fields: registryIssueFields(parsed.error.issues) }); return; }
    lock.current = true; setPending(true); setError(null);
    try {
      const result = await createRegistryDraft(form);
      if (!result.ok) { setError(result); lock.current = false; setPending(false); return; }
      router.push(result.destination);
    } catch { setError({ ok: false, code: "SAVE_FAILED", fields: [] }); lock.current = false; setPending(false); }
  }
  const fieldLinks = { title: "wishlist-title", description: "wishlist-description", eventDate: "wishlist-date", amazonWishlistUrl: "wishlist-store" } as const;
  if (!selectedType) return <OccasionPicker locale={locale} onChoose={selectOccasion} onExplore={() => router.push(`/${locale}/browse`)} onSkip={() => router.push(`/${locale}/my-registries`)} />;
  return <div className="create-wishlist-details">
    <div className="create-occasion-summary"><span>{c.selected}: {occasionLabel(selectedType, locale)}</span><button type="button" onClick={() => { setSelectedType(null); setError(null); router.replace(`/${locale}/create`, { scroll: false }); }} disabled={pending}>{c.change}</button></div>
    <h1>{c.details}</h1><p>{c.detailsHint}</p>
    <form onSubmit={handleSubmit} noValidate className="space-y-6 mt-8 [&_input]:scroll-mt-28 [&_textarea]:scroll-mt-28 [&_[aria-invalid=true]]:border-[var(--brand-error)]" aria-busy={pending}>
      {error && <div ref={summary} tabIndex={-1} role="alert" aria-labelledby="draft-error-heading" className="scroll-mt-28 rounded-xl border-2 border-[var(--brand-error)] bg-[var(--brand-error-surface)] p-5 text-[var(--brand-error)]">
        <h2 id="draft-error-heading" className="text-lg font-semibold">{feedbackCopy.heading}</h2><p className="mt-2 text-sm">{feedbackCopy[error.code]}</p>
        {error.fields.length > 0 && <ul className="mt-3 space-y-2">{error.fields.map(field => field in fieldLinks ? <li key={field}><a className="font-semibold underline" href={`#${fieldLinks[field as keyof typeof fieldLinks]}`} onClick={event => { event.preventDefault(); document.getElementById(fieldLinks[field as keyof typeof fieldLinks])?.focus(); }}>{feedbackCopy[field as keyof typeof fieldLinks]}</a></li> : null)}</ul>}
        {error.code === "AUTH_REQUIRED" && <a className="mt-3 inline-block font-semibold underline" target="_blank" rel="noopener noreferrer" href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/create?type=${selectedType}`)}`}>{feedbackCopy.signIn}</a>}
      </div>}
      <div><label htmlFor="wishlist-title" className="block text-sm font-medium mb-2">{t("registry.title")}</label>
        <Input id="wishlist-title" name="title" required minLength={2} maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder={c.placeholder} aria-invalid={invalid("title")} aria-describedby={invalid("title") ? "wishlist-title-error" : undefined} disabled={pending} />
        {invalid("title") && <p id="wishlist-title-error" className="text-sm text-[var(--brand-error)] mt-2">{feedbackCopy.title}</p>}</div>
      <div><label htmlFor="wishlist-description" className="block text-sm font-medium mb-2">{t("registry.description")} <span className="text-[var(--brand-muted)]">({c.optional})</span></label>
        <textarea id="wishlist-description" name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={3} disabled={pending} aria-invalid={invalid("description")} aria-describedby={invalid("description") ? "wishlist-description-error" : undefined} className="w-full rounded-2xl border border-[var(--brand-line-strong)] bg-[var(--brand-surface)] px-4 py-3 text-sm" />
        {invalid("description") && <p id="wishlist-description-error" className="text-sm text-[var(--brand-error)] mt-2">{feedbackCopy.description}</p>}</div>
      <div><label htmlFor="wishlist-date" className="block text-sm font-medium mb-2">{t("registry.eventDate")} <span className="text-[var(--brand-muted)]">({c.optional})</span></label>
        <Input id="wishlist-date" name="eventDate" type="date" value={date} onChange={event => setDate(event.target.value)} disabled={pending} aria-invalid={invalid("eventDate")} aria-describedby={invalid("eventDate") ? "wishlist-date-error" : undefined} />
        {invalid("eventDate") && <p id="wishlist-date-error" className="text-sm text-[var(--brand-error)] mt-2">{feedbackCopy.eventDate}</p>}</div>
      <details ref={storeDetails}><summary className="cursor-pointer py-2 text-sm text-[var(--brand-secondary)]">{t("registry.amazonWishlist")} ({c.optional})</summary>
        <label htmlFor="wishlist-store" className="block text-sm mb-2 mt-3">{t("registry.amazonWishlist")}</label><Input id="wishlist-store" name="amazonWishlistUrl" type="url" maxLength={2048} value={storeLink} onChange={event => setStoreLink(event.target.value)} disabled={pending} aria-invalid={invalid("amazonWishlistUrl")} aria-describedby={invalid("amazonWishlistUrl") ? "wishlist-store-error" : undefined} />
        {invalid("amazonWishlistUrl") && <p id="wishlist-store-error" className="text-sm text-[var(--brand-error)] mt-2">{feedbackCopy.amazonWishlistUrl}</p>}</details>
      <p className="create-wishlist-privacy">{c.privacy}</p>
      <Button type="submit" variant="default" size="lg" className="w-full rounded-full" disabled={pending}>{pending ? c.saving : c.finish}</Button>
    </form>
  </div>;
}
