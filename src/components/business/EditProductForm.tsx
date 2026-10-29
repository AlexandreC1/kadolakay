"use client";
import { useLocale, useTranslations } from "next-intl";
import { editProduct } from "@/actions/business";
import { useSafeMutation, MutationFeedback } from "@/components/shared/useSafeMutation";
import { catalogCopy } from "@/lib/catalog-copy";
import { inventoryCopy } from "@/lib/inventory-copy";
type Product = { id: string; name: string; description: string | null; category: string | null; priceHTG: number | null; priceUSD: number | null; imageUrl: string | null; inStock: boolean; stockQuantity: number | null };
export function EditProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const c = catalogCopy(locale);
  const stock = inventoryCopy(locale);
  const { pending, status, run } = useSafeMutation();
  const fields = [{ name: "name", label: t("item.title"), value: product.name, type: "text", required: true }, { name: "description", label: t("item.description"), value: product.description, type: "text" }, { name: "category", label: t("business.category"), value: product.category, type: "text" }, { name: "priceHTG", label: t("item.priceHTG"), value: product.priceHTG, type: "number" }, { name: "priceUSD", label: t("item.priceUSD"), value: product.priceUSD, type: "number" }, { name: "imageUrl", label: t("item.image"), value: product.imageUrl, type: "url" }];
  return <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" action={async data => { if (await run(() => editProduct(product.id, data))) onClose(); }}>
    <MutationFeedback status={status} />
    {fields.map(field => <div key={field.name}><label htmlFor={`${product.id}-${field.name}`} className="mb-1 block text-sm font-medium">{field.label}</label><input id={`${product.id}-${field.name}`} name={field.name} type={field.type} defaultValue={field.value ?? ""} required={field.required} step={field.type === "number" ? "0.01" : undefined} min={field.type === "number" ? "0.01" : undefined} maxLength={field.type === "text" ? 1000 : undefined} className="min-h-11 w-full rounded-xl border border-slate-400 px-3" disabled={pending} /></div>)}
    <div><label className="mb-1 block text-sm font-medium" htmlFor={`${product.id}-quantity`}>{stock.quantity}</label>
      <input id={`${product.id}-quantity`} name="stockQuantity" type="number" min="0" max="1000000" step="1" defaultValue={product.stockQuantity ?? ""} aria-describedby={`${product.id}-quantity-hint`} className="min-h-11 w-full rounded-xl border border-slate-400 px-3" disabled={pending} />
      <p id={`${product.id}-quantity-hint`} className="mt-1 text-sm text-[var(--brand-muted)]">{stock.hint}</p></div>
    <label className="block text-sm font-medium" htmlFor={`${product.id}-stock`}>{c.stock}</label>
    <select id={`${product.id}-stock`} name="inStock" defaultValue={String(product.inStock)} className="min-h-11 w-full rounded-xl border border-slate-400 px-3" disabled={pending}><option value="true">{c.inStock}</option><option value="false">{c.outOfStock}</option></select>
    <div className="flex gap-3"><button className="min-h-11 rounded-full bg-[var(--brand-action)] px-5 text-[var(--brand-on-action)]" disabled={pending}>{c.save}</button><button type="button" className="min-h-11 rounded-full border border-slate-400 px-5" disabled={pending} onClick={onClose}>{c.cancel}</button></div>
  </form>;
}
