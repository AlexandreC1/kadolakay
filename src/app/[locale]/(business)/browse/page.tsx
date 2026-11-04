import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { ChevronRight, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { browseBusinessDirectory } from "@/services/catalog-directory";
import { businessCategories, directorySchema, directoryHref } from "@/lib/directory";
import { directoryCopy } from "@/lib/directory-copy";
import { guestCopy } from "@/lib/guest-copy";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import { LiveFilterForm } from "@/components/guest/LiveFilterForm";
import { PageTransition } from "@/components/shared/PageTransition";
import guest from "@/components/guest/guest.module.css";
import styles from "@/components/guest/rows.module.css";

export default async function BrowseBusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [locale, raw, categories] = await Promise.all([getLocale(), searchParams, getTranslations("business.categories")]);
  const c = directoryCopy(locale), g = guestCopy(locale);
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
    } catch {
      error = c.unavailable;
    }
  }
  const input = parsed.success ? parsed.data : { q: "", category: "" as const };
  const action = locale === "ht" ? "/browse" : `/${locale}/browse`;
  const label = (category: string) => (categories.has(category) ? categories(category) : category);
  return (
    <PageTransition>
      <div className={guest.page}>
        <header className={guest.header}>
          <div>
            <h1 className={guest.title}>{c.title}</h1>
            <p className={guest.intro}>{c.intro}</p>
          </div>
          <Link href="/business" className={guest.headerLink}>
            {c.register}
          </Link>
        </header>
        <LiveFilterForm action={action} pendingLabel={g.updating}>
          <div className={`${guest.field} ${guest.fieldWide}`}>
            <label htmlFor="business-search">{c.search}</label>
            <input id="business-search" name="q" type="search" maxLength={80} defaultValue={typeof raw.q === "string" ? raw.q.slice(0, 80) : ""} />
          </div>
          <div className={guest.field}>
            <label htmlFor="business-category">{c.category}</label>
            <select id="business-category" name="category" defaultValue={input.category}>
              <option value="">{c.all}</option>
              {businessCategories.map((category) => (
                <option key={category} value={category}>
                  {label(category)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={guest.submit}>
            {c.submit}
          </button>
          {(input.q || input.category || input.after) && (
            <Link href="/browse" className={guest.clear}>
              {c.clear}
            </Link>
          )}
        </LiveFilterForm>
        {process.env.NODE_ENV === "development" && <p className={guest.note}>{c.sample}</p>}
        {error ? (
          <section className={guest.error} role="alert">
            <p>{error}</p>
            <a className={guest.textLink} href={`${locale === "ht" ? "" : `/${locale}`}${directoryHref(input)}`}>
              {result?.status === "expired" || !parsed.success ? c.reset : c.retry}
            </a>
          </section>
        ) : result && !result.items.length ? (
          <section className={guest.empty} role="status">
            <h2>{c.empty}</h2>
            <p>{c.emptyHint}</p>
          </section>
        ) : (
          <section aria-labelledby="shops-found" className={styles.results}>
            <div className={guest.resultsHead}>
              <h2 id="shops-found">{g.shopCount(result?.items.length ?? 0)}</h2>
            </div>
            <ul className={styles.rows}>
              {result?.items.map((business) => (
                <li key={business.id}>
                  <Link href={`/businesses/${business.slug}`} className={styles.row} transitionTypes={["nav-forward"]}>
                    <span className={styles.thumb}>
                      {business.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={business.coverUrl} alt="" loading="lazy" />
                      ) : (
                        <Store size={22} strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </span>
                    <span className={styles.main}>
                      <strong>{business.name}</strong>
                      <span className={styles.meta}>
                        {[business.category ? label(business.category) : null, business.city].filter(Boolean).join(", ")}
                      </span>
                      {business.description && <span className={styles.description}>{business.description}</span>}
                      {business.products.length > 0 && (
                        <span className={styles.products}>
                          {business.products.map((product) => (
                            <span key={product.id}>{product.name}</span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className={styles.count}>{g.giftCount(business.productCount)}</span>
                    <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!error && result && (input.after || result.next) && (
          <nav className={guest.pagination} aria-label={c.page}>
            {input.after && <Link href={directoryHref(input)}>{c.first}</Link>}
            {result.next && <Link href={directoryHref(input, result.next)}>{c.next}</Link>}
          </nav>
        )}
      </div>
    </PageTransition>
  );
}
