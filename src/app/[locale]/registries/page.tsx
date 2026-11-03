import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Baby, Cake, ChevronRight, Gift, HeartHandshake, ShoppingBag, TreePine } from "lucide-react";
import { workspaceCopy } from "@/lib/workspace-copy";
import { occasionTypes, occasionLabel } from "@/lib/occasions";
import { searchPublicRegistries, registrySearchSchema } from "@/services/baskets-privacy";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import { Link } from "@/i18n/navigation";
import { formatEventDate } from "@/lib/event-date";
import { daysUntil, listCopy } from "@/lib/wishlist-copy";
import { guestCopy } from "@/lib/guest-copy";
import { LiveFilterForm } from "@/components/guest/LiveFilterForm";
import { PageTransition } from "@/components/shared/PageTransition";
import guest from "@/components/guest/guest.module.css";
import rows from "@/components/guest/rows.module.css";

export const metadata = { robots: { index: false, follow: false } };
const icons = { BIRTHDAY: Cake, BABY_SHOWER: Baby, WEDDING: HeartHandshake, CHRISTMAS: TreePine, SHOPPING: ShoppingBag, OTHER: Gift };

export default async function RegistrySearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    l = listCopy(locale),
    g = guestCopy(locale),
    raw = await searchParams,
    parsed = registrySearchSchema.safeParse({ q: raw.q, type: raw.type, after: raw.after });
  let error = false,
    result: Awaited<ReturnType<typeof searchPublicRegistries>> | undefined;
  if (!parsed.success) error = true;
  else
    try {
      if (!(await checkRateLimit("general", `public-registry-search:${rateLimitClientKey(await headers())}`)).ok) error = true;
      else result = await searchPublicRegistries(parsed.data);
    } catch {
      error = true;
    }
  const input = parsed.success ? parsed.data : { q: "", type: "" };
  const action = locale === "ht" ? "/registries" : `/${locale}/registries`;
  return (
    <PageTransition>
      <div className={guest.page}>
        <header className={guest.header}>
          <div>
            <h1 className={guest.title}>{c.registrySearch}</h1>
            <p className={guest.intro}>{c.searchPrivacy}</p>
          </div>
          <Link href="/find" className={guest.headerLink}>
            {g.findByLink}
          </Link>
        </header>
        <LiveFilterForm action={action} pendingLabel={g.updating}>
          <div className={`${guest.field} ${guest.fieldWide}`}>
            <label htmlFor="registry-q">{c.nameEvent}</label>
            <input name="q" id="registry-q" type="search" maxLength={80} defaultValue={input.q} />
          </div>
          <fieldset className={guest.choices} style={{ flexBasis: "100%" }}>
            <legend className={guest.legend}>{c.occasion}</legend>
            {[["", c.all] as const, ...occasionTypes.map((t) => [t, occasionLabel(t, locale)] as const)].map(([value, text]) => (
              <label key={value || "all"}>
                <input type="radio" name="type" value={value} defaultChecked={(input.type || "") === value} />
                {text}
              </label>
            ))}
          </fieldset>
          <button type="submit" className={guest.submit}>
            {c.search}
          </button>
        </LiveFilterForm>
        {error ? (
          <p role="alert" className={guest.error}>
            {c.searchError}
          </p>
        ) : !result?.items.length ? (
          <section className={guest.empty} role="status">
            <p>{c.noResults}</p>
            <Link href="/find">{g.findByLink}</Link>
          </section>
        ) : (
          <section aria-labelledby="lists-found" className={rows.results}>
            <div className={guest.resultsHead}>
              <h2 id="lists-found">{g.listCount(result.items.length)}</h2>
            </div>
            <ul className={rows.rows}>
              {result.items.map((r) => {
                const Icon = icons[r.type as keyof typeof icons] ?? Gift;
                const days = r.eventDate ? daysUntil(r.eventDate) : null;
                return (
                  <li key={r.id}>
                    <Link href={`/r/${r.slug}`} className={rows.row} transitionTypes={["nav-forward"]}>
                      <span className={rows.thumb}>
                        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className={rows.main}>
                        <strong>{r.title}</strong>
                        <span className={rows.meta}>
                          {[occasionLabel(r.type, locale), r.user.name].filter(Boolean).join(", ")}
                        </span>
                      </span>
                      {r.eventDate && (
                        <span className={rows.count}>
                          <time dateTime={r.eventDate.toISOString()}>{formatEventDate(r.eventDate, locale)}</time>
                          {days != null && days >= 0 ? <><br />{l.countdown(days)}</> : null}
                        </span>
                      )}
                      <ChevronRight className={rows.chevron} size={18} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {result?.next && (
          <nav className={guest.pagination}>
            <Link href={`/registries?${new URLSearchParams({ q: input.q, type: input.type, after: result.next })}`}>{c.next}</Link>
          </nav>
        )}
      </div>
    </PageTransition>
  );
}
