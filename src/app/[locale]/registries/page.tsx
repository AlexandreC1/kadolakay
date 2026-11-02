import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { workspaceCopy } from "@/lib/workspace-copy";
import { occasionTypes, occasionLabel } from "@/lib/occasions";
import {
  searchPublicRegistries,
  registrySearchSchema,
} from "@/services/baskets-privacy";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import { Link } from "@/i18n/navigation";
import { formatEventDate } from "@/lib/event-date";
export const metadata = { robots: { index: false, follow: false } };
export default async function RegistrySearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    raw = await searchParams,
    parsed = registrySearchSchema.safeParse({
      q: raw.q,
      type: raw.type,
      after: raw.after,
    });
  let error = false,
    result: Awaited<ReturnType<typeof searchPublicRegistries>> | undefined;
  if (!parsed.success) error = true;
  else
    try {
      if (
        !(
          await checkRateLimit(
            "general",
            `public-registry-search:${rateLimitClientKey(await headers())}`,
          )
        ).ok
      )
        error = true;
      else result = await searchPublicRegistries(parsed.data);
    } catch {
      error = true;
    }
  const input = parsed.success ? parsed.data : { q: "", type: "" };
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{c.registrySearch}</h1>
        <p>{c.searchPrivacy}</p>
      </header>
      <form
        className="discovery-filters"
        method="get"
        action={locale === "ht" ? "/registries" : `/${locale}/registries`}
      >
        <div>
          <label htmlFor="registry-q">{c.nameEvent}</label>
          <input
            name="q"
            id="registry-q"
            maxLength={80}
            defaultValue={input.q}
          />
        </div>
        <div>
          <label htmlFor="registry-type">{c.occasion}</label>
          <select name="type" id="registry-type" defaultValue={input.type}>
            <option value="">{c.all}</option>
            {occasionTypes.map((t) => (
              <option key={t} value={t}>
                {occasionLabel(t, locale)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">{c.search}</button>
      </form>
      {error ? (
        <p role="alert" className="foundation-error">
          {c.searchError}
        </p>
      ) : (
        <div className="workspace-list">
          {result?.items.map((r) => (
            <article className="foundation-panel" key={r.id}>
              <p className="foundation-eyebrow">
                {occasionLabel(r.type, locale)}
              </p>
              <h2>
                <Link href={`/r/${r.slug}`}>{r.title}</Link>
              </h2>
              {r.user.name && <p>{r.user.name}</p>}
              {r.eventDate && (
                <time dateTime={r.eventDate.toISOString()}>
                  {formatEventDate(r.eventDate, locale)}
                </time>
              )}
            </article>
          ))}
          {!result?.items.length && <p>{c.noResults}</p>}
        </div>
      )}
      {result?.next && (
        <Link
          href={`/registries?${new URLSearchParams({ q: input.q, type: input.type, after: result.next })}`}
        >
          {c.next}
        </Link>
      )}
    </div>
  );
}
