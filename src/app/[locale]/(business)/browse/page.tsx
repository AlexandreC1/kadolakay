import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { browseBusinessDirectory } from "@/services/catalog-directory";
import { businessCategories, directorySchema, directoryHref } from "@/lib/directory";
import { directoryCopy } from "@/lib/directory-copy";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import styles from "./directory.module.css";

export default async function BrowseBusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [locale, raw, categories] = await Promise.all([getLocale(), searchParams, getTranslations("business.categories")]);
  const c = directoryCopy(locale);
  const parsed = directorySchema.safeParse({ q: raw.q, category: raw.category, after: raw.after });
  let error: string | undefined;
  let result: Awaited<ReturnType<typeof browseBusinessDirectory>> | undefined;
  if (!parsed.success) error = c.invalid;
  else {
    try {
      const limit = await checkRateLimit("general", `directory:${rateLimitClientKey(await headers())}`);
      if (!limit.ok) error = limit.unavailable ? c.unavailable : c.limited;
      else {
        result = await browseBusinessDirectory(parsed.data);
        if (result.status === "expired") error = c.expired;
      }
    } catch { error = c.unavailable; }
  }
  const input = parsed.success ? parsed.data : { q: "", category: "" as const };
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>{c.title}</h1><p>{c.intro}</p></div><Link href="/business/signup">{c.register}</Link></header>
    <form action={locale === "ht" ? "/browse" : `/${locale}/browse`} method="get" className={styles.filters}>
      <div><label htmlFor="business-search">{c.search}</label><input id="business-search" name="q" maxLength={80} defaultValue={typeof raw.q === "string" ? raw.q.slice(0,80) : ""} /></div>
      <div><label htmlFor="business-category">{c.category}</label><select id="business-category" name="category" defaultValue={input.category}><option value="">{c.all}</option>{businessCategories.map(category => <option key={category} value={category}>{categories(category)}</option>)}</select></div>
      <button type="submit">{c.submit}</button>{(input.q || input.category || input.after) && <Link href="/browse">{c.clear}</Link>}
    </form>
    {process.env.NODE_ENV === "development" && <p className={styles.sample}>{c.sample}</p>}
    {error ? <section className={styles.feedback} role="alert"><p>{error}</p><a href={`${locale === "ht" ? "" : `/${locale}`}${directoryHref(input)}`}>{result?.status === "expired" || !parsed.success ? c.reset : c.retry}</a></section> : result && !result.items.length ? <section className={styles.feedback} role="status"><h2>{c.empty}</h2><p>{c.emptyHint}</p></section> : <div className={styles.grid}>{result?.items.map(business => <article key={business.id} className={styles.business}>
      {business.coverUrl && <Link href={`/businesses/${business.slug}`} className={styles.cover}><img src={business.coverUrl} alt="" loading="lazy" /></Link>}
      <div className={styles.body}><p className={styles.meta}>{[categories.has(business.category) ? categories(business.category) : business.category, business.city].filter(Boolean).join(" · ")}</p><h2><Link href={`/businesses/${business.slug}`}>{business.name}</Link></h2>{business.description && <p className={styles.description}>{business.description}</p>}
      <p className={styles.count}>{c.products}: {business.productCount}</p>{business.products.length > 0 && <ul>{business.products.map(product => <li key={product.id}><Link href={`/gifts/${product.id}`}>{product.name}</Link></li>)}</ul>}
      <Link href={`/businesses/${business.slug}`} className={styles.visit}>{c.visit}</Link></div>
    </article>)}</div>}
    {!error && result && (input.after || result.next) && <nav className={styles.pagination} aria-label={c.page}>{input.after && <Link href={directoryHref(input)}>{c.first}</Link>}{result.next && <Link href={directoryHref(input,result.next)}>{c.next}</Link>}</nav>}
  </div>;
}
