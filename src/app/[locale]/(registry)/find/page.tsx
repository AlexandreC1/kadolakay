import type { Metadata } from "next";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { registryAddress } from "@/lib/registry-address";
import { finderCopy } from "@/lib/finder-copy";
import { previewSharedRegistry } from "@/services/registry-finder";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import styles from "./finder.module.css";
import { formatEventDate } from "@/lib/event-date";
import { RegistryQrScanner } from "@/components/registry/RegistryQrScanner";
import { occasionLabel } from "@/lib/occasions";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "same-origin" };

export default async function FindRegistry({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[] }> }) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const c = finderCopy(locale);
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let result: Awaited<ReturnType<typeof previewSharedRegistry>> | undefined;
  let error: string | undefined;
  if (q !== undefined) {
    if (typeof q !== "string" || !registryAddress(q, base)) error = c.invalid;
    else {
      try {
        const limit = await checkRateLimit("general", `registry-finder:${rateLimitClientKey(await headers())}`);
        if (!limit.ok) error = limit.unavailable ? c.failed : c.limited;
        else {
          result = await previewSharedRegistry(q, base);
          if (result.status !== "found") error = result.status === "invalid" ? c.invalid : c.missing;
        }
      } catch { error = c.failed; }
    }
  }
  const registry = result?.status === "found" ? result.registry : null;
  const occasion = registry ? occasionLabel(registry.type, locale) : c.other;
  return <div className={styles.page}>
    <header><h1>{c.title}</h1><p>{c.intro}</p></header>
    <RegistryQrScanner baseUrl={base} />
    <form action={locale === "ht" ? "/find" : `/${locale}/find`} method="get" className={styles.form}>
      <label htmlFor="registry-address">{c.label}</label>
      <p id="address-hint" className={styles.hint}>{c.hint}</p>
      <div className={styles.controls}>
        <input id="registry-address" name="q" type="text" defaultValue={typeof q === "string" ? q.slice(0, 500) : ""} required maxLength={500} autoCapitalize="none" spellCheck={false} aria-invalid={error ? true : undefined} aria-describedby={`address-hint${error ? " finder-error" : ""}`} />
        <button type="submit">{c.submit}</button>
      </div>
      {error && <p id="finder-error" role="alert" className={styles.error}>{error}</p>}
    </form>
    {registry && <section className={styles.result} aria-labelledby="result-title">
      <p className={styles.eyebrow}>{c.result}</p><p className={styles.occasion}>{occasion}</p>
      <h2 id="result-title">{registry.title}</h2>
      <dl><div><dt>{c.gifts}</dt><dd>{registry.giftCount}</dd></div>{registry.eventDate && <div><dt>{c.date}</dt><dd>{formatEventDate(registry.eventDate, locale)}</dd></div>}</dl>
      {!registry.giftCount && <p>{c.noGifts}</p>}
      <Link href={`/r/${registry.slug}`} className={styles.open}>{c.open}</Link>
    </section>}
    <p className={styles.privacy}>{c.privacy}</p>
    <p className={styles.create}>{c.create} <Link href="/create">{c.createLink}</Link></p>
  </div>;
}
