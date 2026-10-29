"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { addBusinessProductToRegistry } from "@/actions/registry-item";
import { useSafeMutation, MutationFeedback } from "@/components/shared/useSafeMutation";
import { catalogCopy } from "@/lib/catalog-copy";

export function AddCatalogGift({ productId, registries }: { productId: string; registries: { id: string; title: string }[] }) {
  const t = catalogCopy(useLocale());
  const [registryId, setRegistryId] = useState(registries[0]?.id || "");
  const { pending, status, run } = useSafeMutation();
  return <form className="space-y-4" action={async () => { if (registryId) await run(() => addBusinessProductToRegistry(registryId, productId)); }}>
    <label className="block text-sm font-semibold" htmlFor="catalog-registry">{t.choose}</label>
    <select id="catalog-registry" value={registryId} onChange={event => setRegistryId(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-400 bg-[var(--brand-surface)] px-4" required disabled={pending}>
      {registries.map(registry => <option key={registry.id} value={registry.id}>{registry.title}</option>)}
    </select>
    <button type="submit" className="min-h-12 rounded-full bg-[var(--brand-action)] px-6 py-3 font-semibold text-[var(--brand-on-action)] disabled:opacity-50" disabled={pending || !registryId}>{t.add}</button>
    <MutationFeedback status={status} />
  </form>;
}
