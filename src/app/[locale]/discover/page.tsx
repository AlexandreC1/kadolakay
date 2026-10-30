import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { Link } from "@/i18n/navigation";
import { foundationsCopy } from "@/lib/foundations-copy";
import { discoverySchema, occasions } from "@/lib/gift-discovery";
import {
  currentSeason,
  parseSeasonPreference,
  seasonCookie,
} from "@/lib/seasons";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import { discoverGifts } from "@/services/discovery";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [locale, raw, jar] = await Promise.all([
    getLocale(),
    searchParams,
    cookies(),
  ]);
  const c = foundationsCopy(locale);
  const season = currentSeason(
    new Date(),
    parseSeasonPreference(jar.get(seasonCookie)?.value),
  );
  const defaultOccasion =
    season === "christmas"
      ? "CHRISTMAS"
      : season === "valentine"
        ? "VALENTINE"
        : "ANY";
  const parsed = discoverySchema.safeParse({
    budget: raw.budget,
    currency: raw.currency,
    occasion: raw.occasion ?? defaultOccasion,
  });
  let error: string | undefined;
  let gifts: Awaited<ReturnType<typeof discoverGifts>> = [];
  if (!parsed.success) error = c.invalid;
  else
    try {
      const limit = await checkRateLimit(
        "general",
        `discovery:${rateLimitClientKey(await headers())}`,
      );
      if (!limit.ok) error = limit.unavailable ? c.unavailable : c.limited;
      else gifts = await discoverGifts(parsed.data);
    } catch {
      error = c.unavailable;
    }
  const input = parsed.success
    ? parsed.data
    : { budget: "100", currency: "USD", occasion: "ANY" };
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <p className="foundation-eyebrow">Bayou</p>
        <h1>{c.discover}</h1>
        <p>{c.discoveryIntro}</p>
      </header>
      <form
        method="get"
        className="discovery-filters"
        action={locale === "ht" ? "/discover" : `/${locale}/discover`}
      >
        <div>
          <label htmlFor="budget">{c.budget}</label>
          <input
            id="budget"
            name="budget"
            inputMode="decimal"
            type="text"
            pattern="[0-9]{1,7}(\.[0-9]{1,2})?"
            maxLength={10}
            required
            defaultValue={
              typeof raw.budget === "string"
                ? raw.budget.slice(0, 10)
                : input.budget
            }
            aria-describedby="discovery-price-note"
          />
        </div>
        <div>
          <label htmlFor="currency">{c.currency}</label>
          <select id="currency" name="currency" defaultValue={input.currency}>
            <option value="USD">USD</option>
            <option value="HTG">HTG</option>
          </select>
        </div>
        <div>
          <label htmlFor="occasion">{c.occasion}</label>
          <select id="occasion" name="occasion" defaultValue={input.occasion}>
            {occasions.map((o) => (
              <option value={o} key={o}>
                {c.occasions[o]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">{c.search}</button>
      </form>
      <p id="discovery-price-note" className="foundation-note">
        {c.priceNote}
      </p>
      {error ? (
        <p className="foundation-error" role="alert">
          {error}
        </p>
      ) : gifts.length ? (
        <div className="discovery-grid">
          {gifts.map((gift) => (
            <article key={gift.id} className="discovery-gift">
              {gift.imageUrl && (
                <img
                  src={gift.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={300}
                />
              )}
              <div className="discovery-gift-body">
                <p className="foundation-eyebrow">{gift.businessName}</p>
                <h2>
                  <Link href={`/gifts/${gift.id}`}>{gift.name}</Link>
                </h2>
                <p className="discovery-price">
                  {new Intl.NumberFormat(locale === "ht" ? "fr-HT" : locale, {
                    style: "currency",
                    currency: input.currency,
                  }).format(Number(gift.amount))}
                </p>
                <p>{gift.reason === "occasion" ? c.match : c.within}</p>
                <Link href={`/gifts/${gift.id}`}>{c.view}</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="foundation-panel">
          <h2>{c.empty}</h2>
          <p>{c.emptyHint}</p>
          <Link href="/browse">{c.businessLink}</Link>
        </section>
      )}
    </div>
  );
}
