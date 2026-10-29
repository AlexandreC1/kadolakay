"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { checkoutAttempt, clearCheckoutAttempt, readCheckoutAttempt, subscribeCheckoutAttempt } from "@/lib/checkout-attempt";
import { useTranslations } from "next-intl";
import { CreditCard, LockKeyhole } from "lucide-react";
import { createOrder, resumeOrder } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CheckoutItem { id: string; title: string; priceUSD: number | null; quantity: number; businessName: string | null }
const copy = {
  en: { card: "Card payment with Stripe", detail: "Visa, Mastercard and eligible wallets. Charged in USD. Card details stay with Stripe.", unavailable: "Online payments are not available yet. Please contact the registry owner before purchasing.", select: "Select at least one available gift.", failed: "We could not start checkout. Please try again later. No payment has been confirmed.", stock: "A selected gift is no longer available. Refresh this page to choose another.", invalid: "Check your name, email and gift selection, then try again.", rate: "Too many attempts. Wait a minute before trying again.", cancelled: "Checkout was cancelled. No payment has been confirmed. Your gift may remain reserved for up to 35 minutes.", other: "MonCash, Natcash and PayPal are planned. They are not available in this release." },
  fr: { card: "Paiement par carte avec Stripe", detail: "Visa, Mastercard et portefeuilles compatibles. Paiement en USD. Stripe protège vos données de carte.", unavailable: "Le paiement en ligne n’est pas encore disponible. Contactez le propriétaire du registre avant tout achat.", select: "Choisissez au moins un cadeau disponible.", failed: "Impossible de démarrer le paiement. Réessayez plus tard. Aucun paiement n’est confirmé.", stock: "Un cadeau choisi n’est plus disponible. Actualisez cette page.", invalid: "Vérifiez votre nom, votre courriel et les cadeaux choisis.", rate: "Trop de tentatives. Attendez une minute avant de réessayer.", cancelled: "Paiement annulé. Aucun paiement n’est confirmé. Votre cadeau peut rester réservé pendant 35 minutes.", other: "MonCash, Natcash et PayPal sont prévus, mais indisponibles dans cette version." },
  ht: { card: "Peye ak kat sou Stripe", detail: "Visa, Mastercard ak bous ki konpatib. Peye an USD. Enfòmasyon kat ou rete sou Stripe.", unavailable: "Peman sou entènèt poko disponib. Kontakte pwopriyetè rejis la anvan ou achte.", select: "Chwazi omwen yon kado ki disponib.", failed: "Nou pa ka kòmanse peman an. Eseye ankò pita. Pa gen peman ki konfime.", stock: "Yon kado ou chwazi pa disponib ankò. Rafrechi paj la.", invalid: "Verifye non ou, imel ou ak kado ou chwazi yo.", rate: "Twòp tantativ. Tann yon minit anvan ou eseye ankò.", cancelled: "Ou anile peman an. Pa gen peman ki konfime. Kado a ka rete rezève pandan 35 minit.", other: "MonCash, Natcash ak PayPal ap vini. Yo poko disponib nan vèsyon sa a." },
};

export function CheckoutForm({ registrySlug, items, locale, paymentAvailable, cancelled = false }: {
  registrySlug: string; items: CheckoutItem[]; locale: string; paymentAvailable: boolean; cancelled?: boolean;
}) {
  const t = useTranslations();
  const c = copy[locale as keyof typeof copy] || copy.ht;
  const available = items.filter((item) => item.quantity > 0 && item.priceUSD !== null && item.priceUSD > 0);
  const [selected, setSelected] = useState<Record<string, number>>(() => Object.fromEntries(available.map((item) => [item.id, 1])));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<string | undefined>(undefined);
  const submitting = useRef(false);
  const [memoryAttempt, setMemoryAttempt] = useState<string | null>(null);
  const storedAttempt = useSyncExternalStore(subscribeCheckoutAttempt, () => {
    try { return readCheckoutAttempt(window.sessionStorage, registrySlug); } catch { return null; }
  }, () => null);
  const savedAttempt = memoryAttempt || storedAttempt;
  const errorElement = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) { errorElement.current?.focus(); errorElement.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); } }, [error]);
  const resumeLabel = { en: "Resume previous checkout", fr: "Reprendre le paiement précédent", ht: "Kontinye peman ki te kòmanse a" }[locale as "en" | "fr" | "ht"] || "Resume previous checkout";
  const retryCopy = {
    en: { conflict: "A checkout is already in progress with your earlier details. Restore those details to resume it. Do not start another payment while its status is uncertain.", pending: "Your earlier checkout is awaiting confirmation. Please wait before trying again.", completed: "This checkout has already been processed. Check your payment confirmation before purchasing again.", expired: "Your earlier checkout has expired. You can try again now." },
    fr: { conflict: "Un paiement est déjà en cours avec vos informations précédentes. Rétablissez-les pour le reprendre. Ne lancez pas un autre paiement tant que son statut est incertain.", pending: "Votre paiement précédent attend une confirmation. Veuillez patienter avant de réessayer.", completed: "Ce paiement a déjà été traité. Vérifiez votre confirmation avant un nouvel achat.", expired: "Votre paiement précédent a expiré. Vous pouvez réessayer maintenant." },
    ht: { conflict: "Gen yon peman ki deja kòmanse ak enfòmasyon ou te antre anvan yo. Mete menm enfòmasyon sa yo pou kontinye. Pa kòmanse yon lòt peman pandan estati a poko klè.", pending: "Peman ou te kòmanse a ap tann konfimasyon. Tanpri tann anvan ou eseye ankò.", completed: "Peman sa a deja trete. Verifye konfimasyon ou anvan ou achte ankò.", expired: "Peman ou te kòmanse a ekspire. Ou ka eseye ankò kounye a." },
  }[locale as "en" | "fr" | "ht"] || { conflict: "A checkout is already in progress.", pending: "Awaiting confirmation.", completed: "Already processed.", expired: "Expired. Try again." };
  const totalMinor = available.reduce((total, item) => total + Math.round((item.priceUSD || 0) * 100) * (selected[item.id] || 0), 0);
  function displayError(code: string, storage: Storage | null) {
    if (code === "CHECKOUT_EXPIRED" || code === "CHECKOUT_NOT_FOUND") { clearCheckoutAttempt(storage, registrySlug); attempt.current = undefined; setMemoryAttempt(null); }
    setError(code === "CHECKOUT_RETRY_CONFLICT" ? retryCopy.conflict : code === "CHECKOUT_PENDING" ? retryCopy.pending : code === "CHECKOUT_COMPLETED" ? retryCopy.completed : code === "CHECKOUT_EXPIRED" ? retryCopy.expired : code === "INVALID_INPUT" ? c.invalid : code === "ITEM_UNAVAILABLE" ? c.stock : code === "RATE_LIMITED" ? c.rate : code === "PAYMENTS_UNAVAILABLE" ? c.unavailable : c.failed);
  }
  async function resume() {
    if (!savedAttempt || submitting.current) return;
    submitting.current = true; setPending(true); setError(null);
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { /* Storage can be blocked. */ }
    try {
      const result = await resumeOrder({ checkoutRequestId: savedAttempt, registrySlug });
      if ("error" in result) displayError(result.error, storage);
      else { window.location.assign(result.redirectUrl); return; }
    } catch { setError(c.failed); }
    submitting.current = false; setPending(false);
  }
  async function submit(form: FormData) {
    if (submitting.current) return;
    setError(null);
    if (!Object.keys(selected).length) return setError(c.select);
    submitting.current = true;
    setPending(true);
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { /* Retry capability stays in memory. */ }
    attempt.current = checkoutAttempt(storage, registrySlug, attempt.current);
    setMemoryAttempt(attempt.current);
    form.set("checkoutRequestId", attempt.current);
    form.set("registrySlug", registrySlug); form.set("locale", locale);
    form.set("registryItemIds", JSON.stringify(Object.keys(selected))); form.set("quantities", JSON.stringify(selected)); form.set("paymentProvider", "stripe");
    try {
      const result = await createOrder(form);
      if ("error" in result) {
        displayError(result.error, storage);
      } else if (result.redirectUrl) { window.location.assign(result.redirectUrl); return; }
      else setError(c.failed);
    } catch { setError(c.failed); }
    setPending(false);
    submitting.current = false;
  }
  return <form action={submit} className="space-y-6">
    {savedAttempt && <Button type="button" variant="outline" disabled={pending || !paymentAvailable} onClick={resume}>{resumeLabel}</Button>}
    {cancelled && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{c.cancelled}</p>}
    <fieldset disabled={pending} className="space-y-3"><legend className="mb-3 font-semibold">{t("registry.items")}</legend>
      {available.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
        <label className="flex flex-1 cursor-pointer items-center gap-3"><input type="checkbox" checked={Boolean(selected[item.id])} onChange={(event) => setSelected((prev) => { const next = { ...prev }; if (event.target.checked) next[item.id] = 1; else delete next[item.id]; return next; })} className="h-5 w-5" /><span><span className="block font-medium">{item.title}</span><span className="text-sm text-gray-600">${item.priceUSD?.toFixed(2)} USD</span></span></label>
        {selected[item.id] && <input aria-label={`${item.title}: ${t("registry.quantity")}`} type="number" min={1} max={Math.min(item.quantity, 100)} value={selected[item.id]} onChange={(event) => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity > 0 && quantity <= Math.min(item.quantity, 100)) setSelected((prev) => ({ ...prev, [item.id]: quantity })); }} className="w-16 rounded-md border p-2" />}
      </div>)}
      {!available.length && <p role="status">{c.stock}</p>}
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium"><span>{t("checkout.buyerName")} *</span><Input name="buyerName" autoComplete="name" maxLength={100} required disabled={pending} /></label><label className="space-y-2 text-sm font-medium"><span>{t("checkout.buyerEmail")} *</span><Input name="buyerEmail" type="email" autoComplete="email" maxLength={254} required disabled={pending} /></label></div>
    <label className="block space-y-2 text-sm font-medium"><span>{t("checkout.buyerPhone")}</span><Input name="buyerPhone" type="tel" autoComplete="tel" maxLength={30} disabled={pending} /></label>
    <label className="block space-y-2 text-sm font-medium"><span>{t("checkout.giftMessage")}</span><textarea name="giftMessage" maxLength={500} rows={3} disabled={pending} className="w-full rounded-lg border border-gray-300 p-3" /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAnonymous" value="true" disabled={pending} />{t("checkout.anonymous")}</label>
    <div className="rounded-xl border border-gray-200 p-5"><div className="flex items-center gap-2 font-semibold"><CreditCard size={20} aria-hidden="true" />{c.card}</div><p className="mt-2 text-sm text-gray-600">{c.detail}</p><p className="mt-3 text-sm text-gray-600">{c.other}</p></div>
    <div className="flex justify-between border-t pt-4 text-xl font-semibold"><span>{t("checkout.total")}</span><span>${(totalMinor / 100).toFixed(2)} USD</span></div>
    {!paymentAvailable && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{c.unavailable}</p>}
    {error && <p role="alert" ref={errorElement} tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <Button type="submit" variant="gold" size="xl" className="w-full gap-2" disabled={pending || !paymentAvailable || !Object.keys(selected).length || totalMinor < 50}><LockKeyhole size={16} aria-hidden="true" />{pending ? t("common.loading") : t("checkout.sendGift")}</Button>
  </form>;
}
