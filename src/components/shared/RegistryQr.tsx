"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function RegistryQr({ slug, url, title }: { slug: string; url: string; title: string }) {
  const locale = useLocale();
  return <RegistryQrContent key={`${slug}:${locale}`} slug={slug} url={url} title={title} locale={locale} />;
}
function RegistryQrContent({ slug, url, title, locale }: { slug: string; url: string; title: string; locale: string }) {
  const t = useTranslations("share");
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch(`/api/registries/${encodeURIComponent(slug)}/qr?locale=${encodeURIComponent(locale)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) throw new Error("QR_UNAVAILABLE");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setImage(objectUrl);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [slug, locale, attempt]);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?=[:/])/.test(url);
  return <section className="my-5 border-y border-[var(--brand-line)] py-5" aria-label={t("qrTitle")}>
    <h3 className="font-semibold">{t("qrTitle")}</h3>
    <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">{t("qrHint")}</p>
    {failed ? <div role="alert" className="mt-4 text-sm"><p>{t("qrFailed")}</p><button type="button" onClick={() => { setFailed(false); setImage(null); setAttempt(value => value + 1); }} className="mt-2 min-h-11 underline underline-offset-4">{t("qrRetry")}</button></div> : image ? <>
      {/* A same-origin generated PNG is kept out of the shared image optimizer/cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={t("qrAlt", { title })} width={280} className="mx-auto my-4 h-auto max-w-full bg-[var(--brand-surface)]" />
      <a href={image} download={`bayou-${slug}-registry-card.png`} className="flex min-h-12 items-center justify-center rounded-full bg-[var(--brand-action)] px-5 py-3 text-sm font-semibold text-[var(--brand-on-action)]">{t("qrDownload")}</a>
    </> : <p role="status" className="py-8 text-center text-sm">{t("qrLoading")}</p>}
    <p className="mt-3 text-xs leading-relaxed text-[var(--brand-muted)]">{t("qrPrivacy")}</p>
    {local && <p className="mt-3 text-sm font-medium" role="note">{t("qrLocal")}</p>}
  </section>;
}
