import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { Link } from "@/i18n/navigation";
import { foundationsCopy } from "@/lib/foundations-copy";
import { discoverySchema, occasions } from "@/lib/gift-discovery";
import { parseSeasonPreference, seasonCookie } from "@/lib/seasons";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import { seasonalPresentation } from "@/services/campaigns";
import { workspaceCopy } from "@/lib/workspace-copy";
import { fromMinorUnits, toMinorUnits } from "@/services/money";
import { discoverGifts } from "@/services/discovery";
import { ViewTransition } from "react";
import { guestCopy } from "@/lib/guest-copy";
import { LiveFilterForm } from "@/components/guest/LiveFilterForm";
import { GiftArt } from "@/components/shared/GiftArt";
import { PageTransition } from "@/components/shared/PageTransition";
import guest from "@/components/guest/guest.module.css";

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
  const w = workspaceCopy(locale);
  const seasonal = await seasonalPresentation(
    locale,
    parseSeasonPreference(jar.get(seasonCookie)?.value),
  );
  const defaultOccasion = seasonal.occasion;
  const parsed = discoverySchema.safeParse({
    budget: raw.budget,
    currency: raw.currency,
    occasion: raw.occasion ?? defaultOccasion,
    budgetMode: raw.budgetMode,
    maxGifts: raw.maxGifts,
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
  const action = locale === "ht" ? "/discover" : `/${locale}/discover`;
  const g = guestCopy(locale);
  const money = (amount: number | string) =>
    new Intl.NumberFormat(locale === "ht" ? "fr-HT" : locale, { style: "currency", currency: input.currency }).format(Number(amount));
  const mode = parsed.success ? parsed.data.budgetMode : "gift";
  const budgetLabel = locale === "fr" ? "Budget maximum" : locale === "ht" ? "Bidjè maksimòm" : "Maximum budget";
  return (
    <PageTransition>
      <div className={guest.page}>
        <header className={guest.header}>
          <div>
            <h1 className={guest.title}>{c.discover}</h1>
            <p className={guest.intro}>{c.discoveryIntro}</p>
          </div>
        </header>
        <LiveFilterForm action={action} pendingLabel={g.updating}>
          <div className={guest.field}>
            <label htmlFor="budget">{budgetLabel}</label>
            <input
              id="budget"
              name="budget"
              inputMode="decimal"
              type="text"
              pattern="[0-9]{1,7}(\.[0-9]{1,2})?"
              maxLength={10}
              required
              defaultValue={typeof raw.budget === "string" ? raw.budget.slice(0, 10) : input.budget}
              aria-describedby="discovery-price-note"
              style={{ width: 140 }}
            />
          </div>
          <fieldset className={guest.choices}>
            <legend className={guest.legend}>{c.currency}</legend>
            {["USD", "HTG"].map((currency) => (
              <label key={currency}>
                <input type="radio" name="currency" value={currency} defaultChecked={input.currency === currency} />
                {currency}
              </label>
            ))}
          </fieldset>
          <fieldset className={guest.choices}>
            <legend className={guest.legend}>{w.budgetMode}</legend>
            {(["gift", "basket"] as const).map((value) => (
              <label key={value}>
                <input type="radio" name="budgetMode" value={value} defaultChecked={mode === value} />
                {value === "gift" ? w.perGift : w.wholeBasket}
              </label>
            ))}
          </fieldset>
          <div className={guest.field}>
            <label htmlFor="max-gifts">{w.maximum} ({w.wholeBasket})</label>
            <input id="max-gifts" name="maxGifts" type="number" min={1} max={12} required defaultValue={parsed.success ? parsed.data.maxGifts : 6} style={{ width: 96 }} />
          </div>
          <fieldset className={guest.choices} style={{ flexBasis: "100%" }}>
            <legend className={guest.legend}>{c.occasion}</legend>
            {occasions.map((o) => (
              <label key={o}>
                <input type="radio" name="occasion" value={o} defaultChecked={input.occasion === o} />
                {c.occasions[o]}
              </label>
            ))}
          </fieldset>
          <button type="submit" className={guest.submit}>
            {c.search}
          </button>
        </LiveFilterForm>
        <p id="discovery-price-note" className={guest.note}>
          {c.priceNote}
        </p>
        {error ? (
          <p className={guest.error} role="alert">
            {error}
          </p>
        ) : gifts.length ? (
          <section aria-labelledby="gifts-found" className={guest.results}>
            <div className={guest.resultsHead}>
              <h2 id="gifts-found">{g.giftCount(gifts.length)}</h2>
              {mode === "basket" && (
                <p>
                  {w.total}: <strong>{money(fromMinorUnits(gifts.reduce((sum, p) => sum + toMinorUnits(p.amount), 0)))}</strong>. {w.bundleHint}
                </p>
              )}
            </div>
            <ul className={guest.tiles}>
              {gifts.map((gift) => (
                <ViewTransition key={gift.id} name={`find-gift-${gift.id}`} update="gift-move" enter="gift-in" exit="gift-out" default="none">
                  <li>
                    <Link href={`/gifts/${gift.id}`} className={guest.tile} transitionTypes={["nav-forward"]}>
                      <GiftArt id={gift.id} name={gift.name} imageUrl={gift.imageUrl} square />
                      <span className={guest.tileShop}>{gift.businessName}</span>
                      {gift.imageUrl && <span className={guest.tileName}>{gift.name}</span>}
                      <span className={guest.tilePrice}>{money(gift.amount)}</span>
                      <span className={guest.tileNote}>{gift.reason === "occasion" ? c.match : c.within}</span>
                    </Link>
                  </li>
                </ViewTransition>
              ))}
            </ul>
          </section>
        ) : (
          <section className={guest.empty}>
            <h2>{c.empty}</h2>
            <p>{c.emptyHint}</p>
            <Link href="/browse">{c.businessLink}</Link>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
