"use client";

import { useState, useEffect, useRef, useId } from "react";
import { unstable_rethrow } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { pickerCopy } from "./product-picker-copy";
import "./product-picker.css";

interface BusinessProduct { id: string; name: string; priceHTG: number | null; priceUSD: number | null; imageUrl: string | null; businessName: string }
type AddResult = { ok: true; addedCount: number } | { ok: false; code: "INVALID_SELECTION" | "REGISTRY_UNAVAILABLE" | "GIFT_ALREADY_ADDED" | "PRODUCT_UNAVAILABLE" };
interface ProductPickerProps { existingProductIds: string[]; onAdd: (productIds: string[]) => Promise<AddResult>; onClose: () => void }

function isProduct(value: unknown): value is BusinessProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return typeof product.id === "string" && typeof product.name === "string" && typeof product.businessName === "string"
    && [product.priceHTG, product.priceUSD].every(price => price === null || (typeof price === "number" && Number.isFinite(price) && price >= 0))
    && (product.imageUrl === null || (typeof product.imageUrl === "string" && /^https?:\/\//i.test(product.imageUrl)));
}

export function ProductPicker({ existingProductIds, onAdd, onClose }: ProductPickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const saveLock = useRef(false);
  const id = useId();
  const t = useTranslations("common");
  const copy = pickerCopy(useLocale());
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [selected, setSelected] = useState<Map<string, BusinessProduct>>(new Map());
  const [search, setSearch] = useState("");
  const [review, setReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal(); searchField.current?.focus();
    return () => { node?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true); setFailed(false);
      try {
        const response = await fetch("/api/products/browse", { signal: controller.signal });
        if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isProduct)) throw new Error("INVALID_CATALOG");
        if (!controller.signal.aborted) setProducts(data);
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void loadProducts(); return () => controller.abort();
  }, [attempt]);

  const existing = new Set(existingProductIds);
  const choices = products.filter(product => !existing.has(product.id));
  // Failed saves and catalog reloads keep the selected products available for review.
  const visible = (review ? [...selected.values()] : choices).filter(product => `${product.name} ${product.businessName}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  function toggle(product: BusinessProduct) {
    if (saveLock.current) return;
    setError(null);
    setSelected(current => {
      const next = new Map(current);
      if (next.has(product.id)) next.delete(product.id);
      else if (next.size < 20) next.set(product.id, product);
      return next;
    });
  }

  async function addSelected() {
    if (saveLock.current || selected.size === 0) return;
    saveLock.current = true; setPending(true); setError(null);
    try {
      const result = await onAdd([...selected.keys()]);
      if (result.ok) { setSelected(new Map()); onClose(); }
      else setError(copy.errors[result.code]);
    } catch (failure) { unstable_rethrow(failure); setError(copy.saveFailed); }
    finally { saveLock.current = false; setPending(false); }
  }

  return <dialog ref={dialog} className="product-picker" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`} onCancel={event => { event.preventDefault(); if (!saveLock.current) onClose(); }}>
    <div className="product-picker-shell" aria-busy={pending}>
      <header className="product-picker-header"><div><h2 id={`${id}-title`}>{copy.title}</h2><p id={`${id}-hint`}>{copy.hint}</p></div><button type="button" className="product-picker-close" disabled={pending} aria-label={t("close")} onClick={onClose}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeWidth="2" d="m6 6 12 12M6 18 18 6" /></svg></button></header>
      <div className="product-picker-tools"><label htmlFor={`${id}-search`}>{copy.search}</label><Input id={`${id}-search`} ref={searchField} value={search} disabled={pending} onChange={event => setSearch(event.target.value)} type="search" /><div className="product-picker-selection"><p role="status" aria-live="polite">{copy.count(selected.size)}</p><button type="button" disabled={pending || (!review && selected.size === 0)} aria-pressed={review} onClick={() => { setReview(!review); setSearch(""); }}>{review ? copy.browse : copy.review}</button><button type="button" disabled={pending || selected.size === 0} onClick={() => { setSelected(new Map()); setError(null); }}>{copy.clear}</button></div></div>
      {error && <p className="product-picker-error" role="alert">{error}</p>}
      <div className="product-picker-list">
        {loading && !review ? <p className="product-picker-empty" role="status">{t("loading")}</p> : failed && !review ? <div className="product-picker-empty"><p role="alert">{t("loadFailed")}</p><Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>{t("retry")}</Button></div> : visible.length === 0 ? <p className="product-picker-empty">{review ? copy.noSelected : search.trim() ? copy.noMatching : choices.length === 0 && products.length > 0 ? copy.allAdded : copy.empty}</p> : visible.map(product => {
          const checked = selected.has(product.id);
          return <label key={product.id} className={`product-picker-row${checked ? " is-selected" : ""}`}><input type="checkbox" checked={checked} disabled={pending || (!checked && selected.size >= 20)} onChange={() => toggle(product)} aria-label={copy.select(product.name)} />{product.imageUrl ? <img src={product.imageUrl} alt="" width="64" height="64" loading="lazy" /> : <span className="product-picker-placeholder"><Package size={24} aria-hidden="true" /></span>}<span className="product-picker-product"><span className="product-picker-name">{product.name}</span><span className="product-picker-business">{product.businessName}</span><CurrencyDisplay priceHTG={product.priceHTG} priceUSD={product.priceUSD} className="text-sm" /></span></label>;
        })}
      </div>
      <footer className="product-picker-footer"><p>{selected.size >= 20 ? copy.limit : copy.terms}</p><div><Button type="button" variant="outline" disabled={pending} onClick={onClose}>{t("cancel")}</Button><Button type="button" disabled={pending || selected.size === 0} onClick={addSelected}>{pending ? copy.adding : copy.add(selected.size)}</Button></div></footer>
    </div>
  </dialog>;
}
